# CLAUDE.md — ShareSnap 프로젝트 마스터 지시 파일

> **이 파일은 Claude Code가 매 세션 시작 시 자동으로 읽는 최상위 지시 파일입니다.**
> 반드시 STATUS.md를 먼저 읽고 현재 진행 상황을 파악한 후 작업을 시작하세요.

## 프로젝트 개요

- **서비스명**: ShareSnap (사진 공유 & 포토북 서비스)
- **설명**: 여행/모임 참여자들이 사진을 공유방에 업로드하고, 포토북 자동편집 → PDF 생성 → 주문까지 연결되는 E2E 플랫폼
- **기술스택**: Next.js 16 (App Router, Turbopack, proxy 컨벤션) + TypeScript + React 19 + Supabase + Fabric.js 6 + Tailwind CSS v4 + shadcn/ui (sonner)
- **배포**: Vercel + Supabase / 모바일: PWA → Android TWA(Play Store) → iOS Capacitor(App Store) — `docs/mobile-deployment.md` 참조
- **인증**: 카카오 로그인 (Supabase Auth OAuth) + Magic Link (카카오 인앱 브라우저에서는 카카오 로그인만 노출)
- **형태**: PWA (모바일 홈 화면 설치 지원, safe-area/viewport-fit=cover 대응)
- **디자인**: "추억을 모아 빛나게" — 선셋 코랄 + 앰버, 시네마 다크모드, Pretendard — `docs/design-system.md`가 단일 소스
- **참여 UX**: 카톡 링크 → 비로그인 미리보기 → 카카오 1탭 참여 퍼널 — `docs/ux-flows.md`가 단일 소스

## 세션 시작 프로토콜

```
1. cat STATUS.md                    ← 현재 Phase, 진행률, 마지막 작업 확인
2. cat MEMORY.md                    ← 누적된 의사결정/이슈 기록 확인
3. STATUS.md의 [NEXT_ACTION] 확인   ← 바로 이어서 할 작업 파악
4. 작업 수행
5. 작업 완료 후 STATUS.md 업데이트  ← 진행률, 완료 항목, 다음 작업 기록
6. 중요 결정/이슈 발생 시 MEMORY.md 업데이트
```

## 절대 규칙 (위반 시 빌드 실패)

### 1. Fabric.js SSR 방지
```tsx
// ❌ 절대 금지 — 빌드 에러 발생
import { Canvas } from 'fabric';

// ✅ 반드시 이렇게
import dynamic from 'next/dynamic';
const FabricCanvas = dynamic(() => import('./FabricCanvas'), { ssr: false });
```

### 2. 모듈 구조 준수
```
src/modules/{모듈명}/
  ├── components/     # React 컴포넌트 (PascalCase)
  ├── hooks/          # 커스텀 훅 (useXxx.ts)
  ├── services/       # API 호출 + 비즈니스 로직 (xxxService.ts)
  ├── utils/          # 유틸리티 함수
  └── types.ts        # TypeScript 타입/인터페이스
```

### 3. DPI 변환 — 단일 소스 사용
```typescript
// 항상 src/modules/editor/utils/dpiConverter.ts만 사용
// A4=2480×3508px, A5=1748×2480px, 210×210=2480×2480px (300dpi)
```

### 4. Supabase 규칙
- RLS(Row Level Security) 반드시 활성화
- Storage 버킷: `photos`, `thumbnails`, `resources`, `pdfs`
- Realtime Channel 네이밍: `room:{roomId}`

### 5. 코딩 규칙
- TypeScript `strict: true`
- 함수형 컴포넌트 + React Hooks only
- 비즈니스 로직은 services/ 레이어에 분리 (컴포넌트에 직접 작성 금지)
- 에러 핸들링: try-catch + toast 알림 필수
- 한국어 주석 사용
- `'use client'` 디렉티브 — 클라이언트 컴포넌트에 반드시 명시

### 6. 커밋 규칙
```
feat(module): 기능 추가 설명
fix(module): 버그 수정 설명
refactor(module): 리팩토링 설명
style(module): 스타일 변경
test(module): 테스트 추가
chore: 설정/도구 변경
```

### 7. 파일 작성 후 검증
```bash
# 매 태스크 완료 후 반드시 실행
npx tsc --noEmit          # 타입 검사
npm run lint              # 린트 검사
npm run build             # 빌드 검사 (Fabric.js SSR 에러 여기서 발견)
```

## Phase 구조 요약

| Phase | 모듈 | 핵심 산출물 | 예상 기간 |
|-------|------|------------|-----------|
| 1 | M0+M1 | 프로젝트 셋업, 인증, DB 스키마 | 2-3일 |
| 2 | M2+M3 | 공유방 CRUD, 실시간 채팅 | 3-4일 |
| 3 | M4 | 사진 업로드, 갤러리, 코멘트 | 3-4일 |
| 4 | M5 | Fabric.js 편집기 (표지/내지) | 5-7일 |
| 5 | M6+M8 | 포토북 자동편집, PDF 생성 | 5-7일 |
| 6 | M7+M9 | 인화/포토북 주문, 관리자 | 3-4일 |
| 7 | 통합 | E2E 테스트, 배포 | 2-3일 |

## 참조 문서

- `STATUS.md` — 현재 진행 상황 (매 세션 필독)
- `MEMORY.md` — 누적 기억 (의사결정, 이슈, 패턴)
- `ORCHESTRATION.md` — Phase별 상세 태스크, 완료 조건, 자동화 파이프라인
- `docs/dev-plan.md` — 전체 개발 스펙 (DB 스키마, API, 모듈 아키텍처)
- `docs/kakao-api-report.md` — 카카오 API 연동 분석 보고서
- `docs/ux-flows.md` — 카카오톡 참여·공유 퍼널 설계 (초대→참여→재방문 루프) ⭐ Phase 3+
- `docs/design-system.md` — 디자인 토큰/타이포/모션/화면별 스펙 (시각 결정의 단일 소스) ⭐ Phase 3+
- `docs/mobile-deployment.md` — PWA/Android TWA/iOS Capacitor 배포 전략 ⭐ Phase 3+

> 같은 파일에 대해 문서 간 지침이 충돌하면: 시각/접근성은 `design-system.md`, 인프라/메타는 `mobile-deployment.md`, 퍼널/플로우는 `ux-flows.md`가 우선.
