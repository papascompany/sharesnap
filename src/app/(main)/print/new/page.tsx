import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { PrintOrderCreator } from "@/modules/print-order/components/PrintOrderCreator";

export const metadata = {
  title: "사진 인화 — ShareSnap",
};

export default async function PrintNewPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/print/new");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 bg-background/85 px-2 backdrop-blur-xl">
        <Link
          href="/orders"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[17px] font-bold tracking-[-0.01em]">사진 인화</h1>
      </header>
      <main className="flex flex-1 flex-col">
        <PrintOrderCreator initialRoomId={room} />
      </main>
    </div>
  );
}
