"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/modules/shared/hooks/useToast";

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      setIsSending(true);
      await onSend(trimmed);
      setValue("");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "전송 실패");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-20 flex gap-2 border-t bg-background/95 p-2 backdrop-blur"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="메시지 입력"
        disabled={disabled || isSending}
        autoComplete="off"
      />
      <Button type="submit" disabled={disabled || isSending || !value.trim()}>
        전송
      </Button>
    </form>
  );
}
