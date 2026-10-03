import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Play, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ALERT_SOUNDS, playAlertSound } from "@/lib/sounds";
import { TTS_VOICES, GENDER_LABEL } from "@/lib/tts-voices";
import { formatBaht } from "@/lib/thai";
import {
  adminSeatAvailable,
  approveDonation,
  claimFirstAdmin,
  getSlipUrl,
  previewVoice,
  rejectDonation,
  sendTestDonation,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "หลังบ้าน — GameVote" },
      { name: "description", content: "จัดการเกม อนุมัติโดเนท ตั้งค่าเสียงและ overlay สำหรับไลฟ์" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "หลังบ้าน — GameVote" },
      { property: "og:description", content: "จัดการเกม โดเนท และการตั้งค่าไลฟ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
  errorComponent: () => <div className="p-6">เกิดข้อผิดพลาดในหน้าหลังบ้าน</div>,
  notFoundComponent: () => <div className="p-6">ไม่พบหน้านี้</div>,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function AdminPage() {
  const queryClient = useQueryClient();

  const isAdmin = useQuery({
    queryKey: ["is-admin-page"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
  });

  const seat = useQuery({
    queryKey: ["admin-seat"],
    enabled: isAdmin.data === false,
    queryFn: () => adminSeatAvailable(),
  });

  if (isAdmin.isLoading)
    return <div className="p-8 text-muted-foreground">กำลังตรวจสอบสิทธิ์...</div>;

  if (!isAdmin.data) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-6">
          <ShieldCheck className="mx-auto mb-3 size-8 text-primary" />
          <h1 className="font-display text-xl font-bold">หน้านี้สำหรับแอดมิน</h1>
          {seat.data?.available ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                ยังไม่มีแอดมินในระบบ กดปุ่มด้านล่างเพื่อรับสิทธิ์เจ้าของช่อง
              </p>
              <Button
                className="mt-4 w-full font-semibold"
                onClick={async () => {
                  try {
                    await claimFirstAdmin();
                    toast.success("รับสิทธิ์แอดมินแล้ว");
                    await queryClient.invalidateQueries();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "รับสิทธิ์ไม่สำเร็จ");
                  }
                }}
              >
                รับสิทธิ์แอดมิน
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              บัญชีนี้ยังไม่มีสิทธิ์เข้าหน้าหลังบ้าน
            </p>
          )}
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const queryClient = useQueryClient();

  const games = useQuery({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const donations = useQuery({
    queryKey: ["admin-donations"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const refreshAll = () => queryClient.invalidateQueries();

  const patchSettings = async (patch: Record<string, unknown>) => {
    if (!settings.data) return;
    const { error } = await supabase
      .from("donation_settings")
      .update(patch as never)
      .eq("id", settings.data.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    await queryClient.invalidateQueries({ queryKey: ["donation-info"] });
  };

  const [newGame, setNewGame] = useState({ title: "", description: "", cover: "", deadline: "" });
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const s = settings.data;
  const overlayUrl =
    typeof window !== "undefined" && s
      ? `${window.location.origin}/overlay/${s.overlay_token}`
      : "";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="font-display text-lg font-extrabold">หลังบ้าน</h1>
          {s && (
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className={s.is_live ? "font-semibold text-primary" : "text-muted-foreground"}>
                {s.is_live ? "กำลังไลฟ์" : "ไม่ได้ไลฟ์"}
              </span>
              <Switch
                checked={s.is_live}
                onCheckedChange={(value) => void patchSettings({ is_live: value })}
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="donations">
          <TabsList className="mb-5 w-full justify-start overflow-x-auto">
            <TabsTrigger value="donations">โดเนท</TabsTrigger>
            <TabsTrigger value="games">เกม</TabsTrigger>
            <TabsTrigger value="payment">บัญชีรับเงิน</TabsTrigger>
            <TabsTrigger value="sound">เสียง & Overlay</TabsTrigger>
          </TabsList>

          {/* ---------- Donations ---------- */}
          <TabsContent value="donations" className="grid gap-3">
            {(donations.data ?? []).length === 0 && (
              <p className="text-muted-foreground">ยังไม่มีรายการโดเนท</p>
            )}
            {(donations.data ?? []).map((donation) => (
              <div
                key={donation.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {donation.donor_name}
                    <span className="ml-2 text-accent">
                      {formatBaht(Number(donation.amount))} บาท
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {donation.message || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(donation.created_at).toLocaleString("th-TH")} · {donation.status}
                  </p>
                </div>
                {donation.slip_path && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const res = await getSlipUrl({
                        data: { path: donation.slip_path as string },
                      });
                      if (res.url) window.open(res.url, "_blank", "noopener");
                      else toast.error("เปิดสลิปไม่ได้");
                    }}
                  >
                    ดูสลิป
                  </Button>
                )}
                {donation.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await approveDonation({ data: { id: donation.id } });
                          toast.success(res.voiceWarning ?? "อนุมัติแล้ว ข้อความจะขึ้นจอไลฟ์");
                          await refreshAll();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "อนุมัติไม่สำเร็จ");
                        }
                      }}
                    >
                      <Check className="size-4" />
                      อนุมัติ
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await rejectDonation({ data: { id: donation.id } });
                        toast.success("ปฏิเสธแล้ว");
                        await refreshAll();
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ---------- Games ---------- */}
          <TabsContent value="games" className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
              <h2 className="font-display font-bold">เพิ่มเกมเอง</h2>
              <Input
                placeholder="ชื่อเกม"
                value={newGame.title}
                onChange={(event) => setNewGame({ ...newGame, title: event.target.value })}
              />
              <Textarea
                placeholder="คำอธิบายสั้นๆ"
                value={newGame.description}
                onChange={(event) => setNewGame({ ...newGame, description: event.target.value })}
              />
              <Input
                placeholder="ลิงก์ภาพปก (ไม่ใส่ก็ได้)"
                value={newGame.cover}
                onChange={(event) => setNewGame({ ...newGame, cover: event.target.value })}
              />
              <div className="grid gap-1.5">
                <Label htmlFor="deadline">ปิดโหวตวันที่ (ไม่ใส่ = เปิดตลอด)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newGame.deadline}
                  onChange={(event) => setNewGame({ ...newGame, deadline: event.target.value })}
                />
              </div>
              <Button
                className="font-semibold"
                onClick={async () => {
                  if (!newGame.title.trim()) {
                    toast.error("ใส่ชื่อเกมด้วยครับ");
                    return;
                  }
                  const { error } = await supabase.from("games").insert({
                    title: newGame.title.trim(),
                    description: newGame.description.trim(),
                    cover_image_url: newGame.cover.trim() || null,
                    deadline: newGame.deadline || null,
                    status: "approved",
                  });
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  setNewGame({ title: "", description: "", cover: "", deadline: "" });
                  toast.success("เพิ่มเกมแล้ว");
                  await refreshAll();
                }}
              >
                เพิ่มเกม
              </Button>
            </div>

            {(games.data ?? []).map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{game.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {game.description || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    สถานะ: {game.status}
                    {game.deadline ? ` · ปิดโหวต ${game.deadline}` : " · เปิดตลอด"}
                  </p>
                </div>
                {game.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await supabase.from("games").update({ status: "approved" }).eq("id", game.id);
                      toast.success("อนุมัติเกมแล้ว");
                      await refreshAll();
                    }}
                  >
                    <Check className="size-4" />
                    อนุมัติ
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await supabase.from("games").delete().eq("id", game.id);
                    toast.success("ลบเกมแล้ว");
                    await refreshAll();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* ---------- Payment ---------- */}
          <TabsContent
            value="payment"
            className="grid gap-3 rounded-xl border border-border bg-card p-4"
          >
            {s && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="channel">ชื่อช่อง</Label>
                  <Input
                    id="channel"
                    defaultValue={s.channel_name}
                    onBlur={(event) => void patchSettings({ channel_name: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bank">ธนาคาร</Label>
                  <Input
                    id="bank"
                    defaultValue={s.bank_name}
                    onBlur={(event) => void patchSettings({ bank_name: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="account">เลขบัญชี / พร้อมเพย์</Label>
                  <Input
                    id="account"
                    defaultValue={s.account_number}
                    onBlur={(event) => void patchSettings({ account_number: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="account-name">ชื่อบัญชี</Label>
                  <Input
                    id="account-name"
                    defaultValue={s.account_name}
                    onBlur={(event) => void patchSettings({ account_name: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="qr">อัปโหลดรูป QR</Label>
                  <Input
                    id="qr"
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const path = `qr/${crypto.randomUUID()}-${file.name}`;
                      const up = await supabase.storage.from("media").upload(path, file);
                      if (up.error) {
                        toast.error(up.error.message);
                        return;
                      }
                      await patchSettings({ qr_image_url: path });
                      toast.success("อัปโหลด QR แล้ว");
                    }}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* ---------- Sound & overlay ---------- */}
          <TabsContent value="sound" className="grid gap-4">
            {s && (
              <>
                <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
                  <Label>ลิงก์ Overlay สำหรับ OBS / TikTok Live Studio</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={overlayUrl} />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={async () => {
                        await navigator.clipboard.writeText(overlayUrl);
                        toast.success("คัดลอกลิงก์แล้ว");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    เพิ่มเป็น Browser Source ขนาด 1920x1080 และติ๊ก &ldquo;Control audio via
                    OBS&rdquo;
                  </p>
                  <Button
                    className="mt-2 font-semibold"
                    disabled={testing}
                    onClick={async () => {
                      setTesting(true);
                      try {
                        const res = await sendTestDonation({ data: {} });
                        toast.success(res.voiceWarning ?? "ส่งโดเนททดสอบขึ้นจอแล้ว");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "ทดสอบไม่สำเร็จ");
                      } finally {
                        setTesting(false);
                      }
                    }}
                  >
                    <Play className="size-4" />
                    ส่งโดเนททดสอบขึ้นจอ
                  </Button>
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
                  <h2 className="font-display font-bold">เสียงแจ้งเตือน</h2>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sound-key">เสียงสำเร็จรูป</Label>
                    <div className="flex gap-2">
                      <select
                        id="sound-key"
                        className={selectClass}
                        value={s.alert_sound_key}
                        onChange={(event) =>
                          void patchSettings({ alert_sound_key: event.target.value })
                        }
                      >
                        {ALERT_SOUNDS.map((sound) => (
                          <option key={sound.key} value={sound.key}>
                            {sound.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() =>
                          void playAlertSound({
                            presetKey: s.alert_sound_key,
                            volume: Number(s.alert_volume),
                          })
                        }
                      >
                        <Play className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="sound-upload">หรืออัปโหลดเสียงเอง (MP3/WAV)</Label>
                    <Input
                      id="sound-upload"
                      type="file"
                      accept="audio/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const path = `sound/${crypto.randomUUID()}-${file.name}`;
                        const up = await supabase.storage.from("media").upload(path, file);
                        if (up.error) {
                          toast.error(up.error.message);
                          return;
                        }
                        await patchSettings({ alert_sound_url: path });
                        toast.success("อัปโหลดเสียงแล้ว");
                      }}
                    />
                    {s.alert_sound_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-self-start"
                        onClick={() => void patchSettings({ alert_sound_url: null })}
                      >
                        กลับไปใช้เสียงสำเร็จรูป
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="volume">
                      ระดับเสียง ({Math.round(Number(s.alert_volume) * 100)}%)
                    </Label>
                    <input
                      id="volume"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      defaultValue={Number(s.alert_volume)}
                      onMouseUp={(event) =>
                        void patchSettings({ alert_volume: Number(event.currentTarget.value) })
                      }
                      onTouchEnd={(event) =>
                        void patchSettings({ alert_volume: Number(event.currentTarget.value) })
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="duration">แสดงข้อความนานกี่วินาที (เมื่อไม่มีเสียงอ่าน)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={3}
                      max={30}
                      defaultValue={s.alert_duration_sec}
                      onBlur={(event) =>
                        void patchSettings({ alert_duration_sec: Number(event.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-bold">เสียงคนอ่านข้อความ (AI)</h2>
                    <Switch
                      checked={s.tts_enabled}
                      onCheckedChange={(value) => void patchSettings({ tts_enabled: value })}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="voice">เลือกเสียง</Label>
                    <div className="flex gap-2">
                      <select
                        id="voice"
                        className={selectClass}
                        value={s.tts_voice}
                        onChange={(event) => void patchSettings({ tts_voice: event.target.value })}
                      >
                        {TTS_VOICES.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.label} — {GENDER_LABEL[voice.gender]} ({voice.note})
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        disabled={previewing}
                        onClick={async () => {
                          setPreviewing(true);
                          try {
                            const res = await previewVoice({
                              data: { voice: s.tts_voice, speed: Number(s.tts_speed) },
                            });
                            const audio = new Audio(res.dataUrl);
                            audio.volume = Number(s.alert_volume);
                            await audio.play();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "ฟังตัวอย่างไม่สำเร็จ",
                            );
                          } finally {
                            setPreviewing(false);
                          }
                        }}
                      >
                        <Play className="size-4" />
                        ลองฟัง
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="speed">ความเร็วเสียงอ่าน</Label>
                    <Input
                      id="speed"
                      type="number"
                      step={0.05}
                      min={0.5}
                      max={2}
                      defaultValue={Number(s.tts_speed)}
                      onBlur={(event) =>
                        void patchSettings({ tts_speed: Number(event.target.value) })
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="template">ข้อความที่ให้อ่าน</Label>
                    <Textarea
                      id="template"
                      defaultValue={s.tts_template}
                      onBlur={(event) => void patchSettings({ tts_template: event.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      ใช้ตัวแปร {"{name}"} {"{amount}"} {"{message}"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
