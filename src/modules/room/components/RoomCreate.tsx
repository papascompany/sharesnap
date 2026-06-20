"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createRoom } from "@/modules/room/services/roomService";
import { useToast } from "@/modules/shared/hooks/useToast";

export function RoomCreate() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError("공유방 이름을 입력해 주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      const room = await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      success("공유방이 생성되었습니다.");
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto mt-6 w-full max-w-md">
      <CardHeader>
        <CardTitle>새 공유방 만들기</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="room-name" className="text-sm font-medium">
              공유방 이름
            </label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 제주도 가족여행"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="room-desc" className="text-sm font-medium">
              설명 (선택)
            </label>
            <Input
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="여행 일정이나 모임 정보를 적어보세요"
              maxLength={200}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "만드는 중..." : "공유방 만들기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
