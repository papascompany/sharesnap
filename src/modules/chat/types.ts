import type { Database } from "@/modules/shared/types/database";
import type { MessageType } from "@/modules/shared/types/global";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert =
  Database["public"]["Tables"]["messages"]["Insert"];

export interface Message extends MessageRow {
  // 향후 user 프로필 조인용 (현재는 user_id만)
  authorName?: string | null;
  authorAvatarUrl?: string | null;
}

export interface SendMessageInput {
  roomId: string;
  type?: MessageType;
  content?: string;
  photoId?: string | null;
}
