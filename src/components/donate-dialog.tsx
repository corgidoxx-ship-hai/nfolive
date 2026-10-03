import { useState } from "react";
import { Banknote, Copy, QrCode, Radio, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { PublicDonationInfo } from "@/lib/public.functions";

export function DonateDialog({
  open,
  info,
  onOpenChange,
}: {
  open: boolean;
  info: PublicDonationInfo | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("คัดลอกแล้ว");
  };

  const submit = async () => {
    const value = Number(amount);
    if (!name.trim()) {
      toast.error("ใส่ชื่อที่อยากให้ขึ้นจอด้วยครับ");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("ใส่จำนวนเงินให้ถูกต้อง");
      return;
    }

    setSending(true);
    try {
      let slipPath: string | null = null;
      if (slip) {
        const ext = slip.name.split(".").pop() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("slips").upload(path, slip);
        if (up.error) throw new Error(up.error.message);
        slipPath = path;
      }

      const { error } = await supabase.from("donations").insert({
        donor_name: name.trim().slice(0, 60),
        amount: value,
        message: message.trim().slice(0, 200),
        slip_path: slipPath,
      });
      if (error) throw new Error(error.message);

      toast.success("ส่งข้อความแล้ว! รอเจ้าของช่องยืนยันสลิปก่อนขึ้นจอไลฟ์");
      setName("");
      setAmount("");
      setMessage("");
      setSlip(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">โดเนทให้กำลังใจ</DialogTitle>
          <DialogDescription>
            โอนเข้าบัญชีด้านล่าง แล้วกรอกข้อความเพื่อขึ้นจอตอนไลฟ์
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {info?.qrUrl ? (
            <img
              src={info.qrUrl}
              alt="QR code สำหรับโอนเงินโดเนท"
              className="mx-auto w-56 rounded-xl border border-border bg-white p-2"
            />
          ) : (
            <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border p-6 text-muted-foreground">
              <QrCode className="size-8" />
              <span className="text-sm">ยังไม่ได้ตั้งค่า QR</span>
            </div>
          )}

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Banknote className="size-4 text-accent" />
              {info?.bankName || "ยังไม่ได้ตั้งค่าธนาคาร"}
            </div>
            {info?.accountNumber && (
              <button
                type="button"
                onClick={() => void copy(info.accountNumber)}
                className="mt-1 flex items-center gap-2 font-mono text-base tracking-wider text-foreground"
              >
                {info.accountNumber}
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            )}
            {info?.accountName && (
              <p className="text-muted-foreground">ชื่อบัญชี: {info.accountName}</p>
            )}
          </div>

          {info?.isLive && (
            <p className="flex items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary">
              <Radio className="size-3.5" />
              ตอนนี้กำลังไลฟ์อยู่ ข้อความจะขึ้นจอทันทีหลังยืนยันสลิป
            </p>
          )}

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="donor-name">ชื่อที่อยากให้ขึ้นจอ</Label>
              <Input
                id="donor-name"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="เช่น พี่ปี๊แฟนคลับ"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="donor-amount">จำนวนเงิน (บาท)</Label>
              <Input
                id="donor-amount"
                type="number"
                inputMode="decimal"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="donor-message">ข้อความ</Label>
              <Textarea
                id="donor-message"
                value={message}
                maxLength={200}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="พิมพ์ข้อความให้เสียงอ่านตอนไลฟ์"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="donor-slip" className="flex items-center gap-2">
                <Upload className="size-4" />
                แนบสลิปโอนเงิน
              </Label>
              <Input
                id="donor-slip"
                type="file"
                accept="image/*"
                onChange={(event) => setSlip(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <Button className="w-full font-semibold" disabled={sending} onClick={() => void submit()}>
            {sending ? "กำลังส่ง..." : "ส่งข้อความโดเนท"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
