# MEMORY.md — ShareSnap 프로젝트 누적 기억

> **세션 간 유지되어야 하는 의사결정, 발견된 패턴, 해결된 이슈를 기록합니다.**
> Claude Code는 매 세션 시작 시 이 파일을 읽어 맥락을 복원합니다.

---

## 아키텍처 결정 기록 (ADR)

### ADR-001: 카카오톡 연동 전략
- **결정일**: 2026-04-13
- **결정**: 카카오톡 오픈채팅 API는 미제공이므로, 카카오 로그인 + 카카오톡 공유 API를 조합한 PWA 하이브리드 방식 채택
- **근거**: 오픈채팅 관련 API가 카카오에서 미제공 (데브톡에서 수년간 요청 중이나 미반영), 비공식 방법은 약관 위반 영구정지 위험
- **영향**: 채팅은 자체 Supabase Realtime으로 구현, 카카오톡은 초대/알림 채널로만 활용

### ADR-002: PWA 방식 채택
- **결정일**: 2026-04-13
- **결정**: 네이티브 앱 대신 PWA(Progressive Web App)로 서비스 제공
- **근거**: 앱스토어 심사 없이 즉시 배포, 카카오톡 공유 링크에서 바로 접근, 홈 화면 설치로 네이티브에 가까운 UX
- **영향**: manifest.json, Service Worker, Web Push API 구현 필요

### ADR-003: Fabric.js 6.x 사용
- **결정일**: 2026-04-13
- **결정**: 포토북 편집기에 Fabric.js 6.x 사용
- **근거**: HTML Canvas 기반, JSON 직렬화 지원 (서버 렌더링 가능), 모바일 터치 지원
- **필수 조건**: 반드시 dynamic import + ssr: false 적용 (SSR 환경에서 Canvas API 미지원)

### ADR-004: Supabase 올인원 백엔드
- **결정일**: 2026-04-13
- **결정**: DB, Auth, Storage, Realtime 모두 Supabase로 통합
- **근거**: PostgreSQL + Auth + S3 Storage + Realtime을 단일 서비스로, RLS로 보안 처리
- **영향**: Supabase 타입 자동 생성(`supabase gen types typescript`) 활용

### ADR-005: 책 사이즈 스펙
- **결정일**: 2026-04-13
- **결정**: A4(210×297mm), A5(148×210mm), 210×210mm 3종, 모두 300dpi
- **300dpi 픽셀**: A4=2480×3508, A5=1748×2480, 210×210=2480×2480
- **블리드**: 3mm, 안전영역: 5mm
- **PDF**: PDF/X-4 호환, 폰트 임베드, JPEG Q95

---

## 기술 패턴 (검증됨)

### 패턴 1: Supabase Auth + 카카오 로그인
```typescript
// Supabase가 카카오 OAuth Provider를 공식 지원
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  }
});
```

### 패턴 2: Next.js 14 + Supabase SSR 클라이언트
```typescript
// 서버 컴포넌트용 (src/modules/shared/lib/supabase/server.ts)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 클라이언트 컴포넌트용 (src/modules/shared/lib/supabase/client.ts)
import { createBrowserClient } from '@supabase/ssr';
```

### 패턴 3: Fabric.js Dynamic Import
```typescript
// 반드시 이 패턴을 사용 — SSR 환경에서 Canvas API 미지원
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('./Editor'), { ssr: false });
```

### 패턴 4: 카카오톡 공유 초대
```javascript
Kakao.Share.sendDefault({
  objectType: 'feed',
  content: {
    title: '공유방 이름',
    imageUrl: 'og-image-url',
    link: { mobileWebUrl: `https://sharesnap.app/join/${shareCode}` },
  },
  buttons: [{ title: '사진 올리기', link: { mobileWebUrl: joinUrl } }],
});
```

---

## 해결된 이슈 아카이브

| 이슈 | 해결 | 날짜 |
|------|------|------|
| (아직 없음) | | |

---

## 프로젝트 컨텍스트

### 핵심 사용자 시나리오
1. 모임장이 공유방 개설 → 카카오톡으로 초대 링크 공유
2. 참여자가 링크 클릭 → 카카오 로그인 → 공유방 입장
3. 여행 중 사진 촬영 → PWA에서 사진 업로드 + 코멘트
4. 여행 후 갤러리에서 사진 모아보기
5. 포토북 만들기 → 사진 선택 → 자동 편집 → 표지/내지 커스텀
6. PDF 생성 → 미리보기 → 포토북 주문
7. 또는 개별 사진 인화 주문

### 모듈 의존성 (순서대로 개발)
```
M0(공용) → M1(인증) → M2(공유방) → M3(채팅) → M4(사진) → M5(편집기) → M6(포토북) + M8(PDF) → M7(인화주문) + M9(관리자)
```

### 카카오 API 사용 범위
- ✅ 카카오 로그인 (Supabase Auth)
- ✅ 카카오톡 공유 (JS SDK, Feed 메시지)
- ✅ 카카오톡 메시지 (나에게 보내기, 알림용)
- ❌ 오픈채팅 API (미제공)
- ❌ 채널 자동 개설 API (미제공)

---

## 환경 설정 메모

### Supabase 프로젝트 정보
```
Project URL  : (프로젝트 생성 후 기록)
Anon Key     : (프로젝트 생성 후 기록)
Service Key  : (프로젝트 생성 후 기록)
```

### 카카오 Developers 정보
```
App Key (JS) : (앱 등록 후 기록)
REST API Key : (앱 등록 후 기록)
Redirect URI : https://sharesnap.app/auth/callback/kakao
```

---

> **[MEMORY.md 업데이트 규칙]**
> - 새로운 아키텍처 결정 시: ADR 섹션에 추가
> - 새로운 기술 패턴 발견 시: 기술 패턴 섹션에 추가
> - 이슈 해결 시: 해결된 이슈 아카이브에 추가
> - 환경 설정 변경 시: 환경 설정 메모 업데이트
> - 절대 삭제하지 말 것 — 이 파일은 프로젝트의 영구 기억입니다
