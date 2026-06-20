import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { RoomList } from "@/modules/room/components/RoomList";
import { APP_NAME } from "@/modules/shared/lib/constants";

export const metadata = {
  title: "공유방 — ShareSnap",
};

export default function RoomsPage() {
  return (
    <MobileLayout
      header={
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">{APP_NAME}</h1>
          <Link href="/rooms/create">
            <Button size="sm">+ 새 방</Button>
          </Link>
        </div>
      }
    >
      <RoomList />
    </MobileLayout>
  );
}
