import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모노레포 오인(상위 디렉토리 lockfile) 방지 — 워크스페이스 루트 고정
  turbopack: {
    root: __dirname,
  },

  // 전역 보안 헤더 — 앱 동작을 깨지 않는 보수적 항목만 적용한다.
  // ⚠️ Content-Security-Policy(script-src/connect-src 등 전체)는 이번에 의도적으로 제외:
  //   외부 호스트 의존이 많아(Storige iframe editor.papascompany.co.kr / Supabase / 카카오 SDK
  //   / jsdelivr Pretendard) + Next의 인라인 스타일·스크립트까지 얽혀 있어, 잘못 설정 시
  //   앱 전체가 화이트아웃된다.
  //   TODO(운영 직전 별도 CSP 작업): 다음을 한 번에 검증해 도입할 것
  //     - frame-src   : editor.papascompany.co.kr (Storige 임베드 호스트)
  //     - connect-src : *.supabase.co / wss://*.supabase.co (REST + Realtime)
  //     - script-src  : 카카오 SDK(t1.kakaocdn.net 등) + Next 런타임(nonce 또는 'strict-dynamic')
  //     - font-src/style-src : cdn.jsdelivr.net (Pretendard dynamic-subset)
  //     - img-src     : 'self' data: blob: + Supabase Storage 공개 버킷 호스트
  async headers() {
    return [
      {
        // 모든 경로에 적용
        source: "/:path*",
        headers: [
          {
            // 우리 페이지가 외부 사이트의 iframe에 임베드되는 것을 차단(클릭재킹 방지).
            // ⚠️ 이는 "우리를 임베드하는" 것을 막는 것으로, 우리가 Storige를 임베드하는
            //   frame-src(자식 iframe 허용)와는 무관하다 — 앱 깨지지 않음.
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            // 브라우저의 MIME 타입 스니핑 차단 (콘텐츠 타입 혼동 공격 방지)
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // 외부 도메인 이동 시 Referer를 origin까지만 전송 (경로/쿼리 유출 방지).
            // 카카오/Supabase 콜백 등 동일 출처 내에서는 전체 URL 유지.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // 권한 정책 — 사진 촬영을 위해 camera는 self(우리 출처)만 허용,
            //   위치·마이크는 전면 차단. (사용처 없는 권한을 명시적으로 닫음)
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
