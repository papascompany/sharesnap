"use client";

import { useChat } from "@/modules/chat/hooks/useChat";
import { MessageInput } from "@/modules/chat/components/MessageInput";
import { MessageList } from "@/modules/chat/components/MessageList";

interface ChatRoomProps {
  roomId: string;
}

export function ChatRoom({ roomId }: ChatRoomProps) {
  const { messages, isLoading, error, send } = useChat(roomId);

  return (
    <div className="flex flex-1 flex-col">
      {error ? (
        <div className="px-4 py-2 text-xs text-destructive">{error.message}</div>
      ) : null}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>
      <MessageInput
        onSend={(content) => send({ type: "text", content })}
      />
    </div>
  );
}
