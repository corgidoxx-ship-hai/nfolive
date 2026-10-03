import { useState } from "react";
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

export function SuggestDialog({
  open,
  userId,
  onOpenChange,
}: {
  open: boolean;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!userId) {
      toast.error("ต้องเข้าสู่ระบบก่อนเสนอเกม");
      return;
    }
    if (!title.trim()) {
      toast.error("ใส่ชื่อเกมด้วยครับ");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("games").insert({
      title: title.trim().slice(0, 120),
      description: description.trim().slice(0, 500),
      created_by: userId,
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ส่งเกมเข้าคิวแล้ว รอเจ้าของช่องอนุมัติ");
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">เสนอเกมใหม่</DialogTitle>
          <DialogDescription>เกมที่เสนอจะขึ้นหน้าโหวตหลังเจ้าของช่องอนุมัติ</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="suggest-title">ชื่อเกม</Label>
            <Input
              id="suggest-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="เช่น Elden Ring"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="suggest-desc">อยากให้เล่นเพราะอะไร</Label>
            <Textarea
              id="suggest-desc"
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="เล่าสั้นๆ ว่าเกมนี้สนุกยังไง"
            />
          </div>
          <Button className="w-full font-semibold" disabled={sending} onClick={() => void submit()}>
            {sending ? "กำลังส่ง..." : "ส่งเกมให้พิจารณา"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
