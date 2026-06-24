import { createClient } from "@/modules/shared/lib/supabase/server";
import { LandingPage } from "@/modules/landing/components/LandingPage";
import { getLandingContent } from "@/modules/landing/services/landingContentServer";

export const metadata = {
  title: "ShareSnap — 추억을 모아 빛나게",
  description:
    "여행·모임 사진을 카톡으로 모아 공유방에 쌓고, 자동으로 포토북까지. 앱 설치 없이 카카오 1탭으로 시작하세요.",
  openGraph: {
    title: "ShareSnap — 친구들 사진, 다 같이 모아 빛나는 한 권으로",
    description:
      "카톡 링크 1탭이면 모두가 사진을 모아요. 고르기만 하면 포토북은 저절로 완성.",
    type: "website",
  },
};

// 루트(/) 공개 랜딩. 미들웨어상 "/"는 public이라 비로그인도 접근.
// 콘텐츠는 CMS(site_content)에서 읽고(기본값 폴백), CTA는 로그인 여부로 분기.
export default async function HomePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    content,
  ] = await Promise.all([supabase.auth.getUser(), getLandingContent()]);

  return <LandingPage isAuthed={Boolean(user)} content={content} />;
}
