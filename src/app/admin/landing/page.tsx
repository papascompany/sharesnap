import { notFound } from "next/navigation";
import { getAdmin } from "@/modules/admin/services/adminAuth";
import { getLandingContent } from "@/modules/landing/services/landingContentServer";
import { LandingEditor } from "@/modules/admin/components/LandingEditor";

export const metadata = {
  title: "랜딩 관리 — ShareSnap",
  robots: { index: false, follow: false },
};

// /admin/landing — 어드민(ADMIN_EMAILS) 전용. 미들웨어가 비로그인을 /login으로,
// 로그인했지만 비어드민이면 notFound(존재 노출 방지).
export default async function AdminLandingPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const content = await getLandingContent();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]">
            랜딩페이지 관리
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {admin.email} · 문구와 이미지를 수정하고 저장하세요
          </p>
        </div>
      </header>
      <LandingEditor initial={content} />
    </div>
  );
}
