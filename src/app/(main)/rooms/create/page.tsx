import Link from "next/link";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { RoomCreate } from "@/modules/room/components/RoomCreate";

export const metadata = {
  title: "공유방 만들기 — ShareSnap",
};

export default function CreateRoomPage() {
  return (
    <MobileLayout
      hideNav
      header={
        <div className="flex h-14 items-center px-4">
          <Link
            href="/rooms"
            className="text-sm text-muted-foreground hover:text-foreground"
            aria-label="뒤로"
          >
            ←
          </Link>
          <h1 className="ml-2 text-base font-semibold">새 공유방</h1>
        </div>
      }
    >
      <div className="px-4">
        <RoomCreate />
      </div>
    </MobileLayout>
  );
}
