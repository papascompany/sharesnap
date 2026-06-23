import { MobileLayout } from "@/modules/shared/components/MobileLayout";
import { PhotobookList } from "@/modules/photobook/components/PhotobookList";

export const metadata = {
  title: "포토북 — ShareSnap",
};

export default function PhotobooksPage() {
  return (
    <MobileLayout
      header={
        <div className="flex h-14 items-center px-4">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">포토북</h1>
        </div>
      }
    >
      <PhotobookList mode="works" />
    </MobileLayout>
  );
}
