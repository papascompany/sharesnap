"use client";

import { createClient } from "@/modules/shared/lib/supabase/client";
import type { Message, SendMessageInput } from "@/modules/chat/types";

export async function listMessages(
  roomId: string,
  limit = 100,
): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<Message> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const payload = {
    room_id: input.roomId,
    user_id: user.id,
    type: input.type ?? "text",
    content: input.content ?? null,
    photo_id: input.photoId ?? null,
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);
  if (error) throw error;
}
