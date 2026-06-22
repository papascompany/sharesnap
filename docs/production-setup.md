# ShareSnap 운영 배포 셋업 가이드

> 운영 인프라(2026-06-20 기준): Supabase `rtnfltwmnizkjrrgjudk` · Vercel `sharesnap-three.vercel.app`(GitHub 연결됨)
> ⚠ 이 두 프로젝트는 CLI 자동화 계정과 달라, 아래는 **대시보드에서 직접 수행**하는 절차입니다. 코드는 env 주입만으로 동작하도록 완성돼 있어 추가 코드 변경은 없습니다.
> 소요: 약 10분 (카카오 앱 등록 제외)

---

## Step 1. Supabase — DB 마이그레이션 적용

Supabase 대시보드(`rtnfltwmnizkjrrgjudk`) → **SQL Editor** → `docs/production-migration.sql` 전체 복사 → 붙여넣기 → **RUN**

- 통합본(001~010 + Realtime publication)이라 한 번에 적용됩니다. idempotent(재실행 안전).
- 적용 후 **Table Editor**에 `rooms`/`room_members`/`messages`/`photos`/`photobook_orders`/`user_storige_map` 등 테이블이 생기면 성공.

## Step 2. Supabase — Storage 버킷 확인

마이그레이션 007이 버킷을 자동 생성합니다. **Storage** 탭에서 4개 확인:
| 버킷 | 공개 | 용도 |
|------|------|------|
| `photos` | 비공개 | 사진 원본 |
| `thumbnails` | **공개** | 썸네일·중간·**인쇄용(print)** — 자동배치/갤러리가 이 public URL 사용 |
| `resources` | 공개 | 편집 리소스 |
| `pdfs` | 비공개 | 합성 PDF |

→ `thumbnails`가 **Public**인지 꼭 확인(자동배치 이미지가 여기서 로드됨). 아니면 버킷 설정에서 Public 토글.

## Step 3. Supabase — Auth URL 설정

**Authentication → URL Configuration**:
- **Site URL**: `https://sharesnap-three.vercel.app`
- **Redirect URLs** (추가):
  - `https://sharesnap-three.vercel.app/auth/callback`
  - `https://sharesnap-three.vercel.app/auth/confirm`
  - `https://sharesnap-three.vercel.app/auth/callback?*` ← **쿼리 글롭 필수**(초대 `next` 파라미터 보존)
  - (선택) `https://*-sharesnap-*.vercel.app/auth/callback` ← 프리뷰 배포용

## Step 4. Supabase — 키 복사 (Step 5에서 사용)

**Settings → API**에서:
- `Project URL` = `https://rtnfltwmnizkjrrgjudk.supabase.co`
- `anon` `public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠ 서버 전용, 절대 클라이언트 노출 금지)

---

## Step 5. Vercel — 환경변수 등록

`sharesnap-three` → **Settings → Environment Variables**. 모두 **Production + Preview** 체크.

| 변수명 | 값 | 비고 |
|--------|----|----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rtnfltwmnizkjrrgjudk.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Step 4 anon 키) | |
| `SUPABASE_SERVICE_ROLE_KEY` | (Step 4 service_role 키) | 🔒 서버 전용 — 웹훅 PDF 회수용 |
| `NEXT_PUBLIC_APP_URL` | `https://sharesnap-three.vercel.app` | 카카오 공유링크·OG·webhook origin |
| `STORIGE_API_URL` | `https://api.papascompany.co.kr/api` | |
| `STORIGE_API_KEY` | (로컬 `.env.local`의 `sk-storige-…` 값 그대로) | 🔒 서버 전용 — 이미 ShareSnap 전용 키 발급됨 |
| `NEXT_PUBLIC_STORIGE_EDITOR_URL` | `https://editor.papascompany.co.kr` | |
| `STORIGE_PHOTOBOOK_PAGE_W_MM` | `210` | 자동배치 판형(상품 정사각). 미설정 시 기본 210 |
| `STORIGE_PHOTOBOOK_PAGE_H_MM` | `210` | 〃 |
| `STORIGE_TEMPLATE_SET_ID` | `sharesnap-210sq-book` | ✅ 완전한 book-mode 셋 "ShareSnap 210x210 포토북"(표지 spread 422×210 + 내지 page 210×210). **반드시 표지+내지(page) 템플릿을 모두 갖춘 셋**이라야 편집기에 내지가 보인다. 쓰면 안 되는 것: 슬러그 `photobook-210-book-4p`(미존재→404), `2f312032`(표지만 있어 내지 0). 미설정 시 dev 폴백 `a2cc2939…`(A4, 판형 불일치) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | (Step 6 카카오 JS 키) | 미설정 시 카카오 공유 버튼만 비활성(앱은 정상) |
| `KAKAO_REST_API_KEY` | (선택) | |

> 등록 후 **Deployments → Redeploy** (또는 `git push`로 자동 배포)해야 env가 반영됩니다.

---

## Step 6. 카카오 (로그인·공유 활성화) — 앱 등록 필요

1. [카카오 Developers](https://developers.kakao.com) → 앱 생성
2. **JavaScript 키** → Vercel `NEXT_PUBLIC_KAKAO_JS_KEY`
3. **카카오 로그인 활성화** + **Redirect URI**에 등록:
   `https://rtnfltwmnizkjrrgjudk.supabase.co/auth/v1/callback` ← Supabase가 카카오 토큰교환 대행(우리 `/auth/callback` 아님)
4. **플랫폼 → Web** 사이트 도메인에 `https://sharesnap-three.vercel.app` 등록 (JS SDK·공유용)
5. Supabase **Authentication → Providers → Kakao** 활성화 + REST API 키·Client Secret 입력

## Step 7. Storige (운영자 작업)

1. **실 포토북 templateSet** — ✅ **완료**: Storige DB에 완전한 셋 `sharesnap-210sq-book`("ShareSnap 210x210 포토북")이 등록됨(2026-06-22, known-good `sample-8x8-book-24p` 구조를 210×210으로 복제). 구성: `editor_mode=book`, 셋 210×210, **표지 spread(`sharesnap-210sq-cover` 422×210) + 내지 page(`sharesnap-210sq-page` 210×210)**. Vercel `STORIGE_TEMPLATE_SET_ID=sharesnap-210sq-book`(완료). ⚠ **핵심 규칙: templateSet은 표지(cover/spread)뿐 아니라 내지(page) 템플릿이 반드시 1개 이상 있어야 편집기에 내지가 보인다.** 표지만 있는 셋(예: 초기 `2f312032`)이나 미존재 슬러그(`photobook-210-book-4p`)는 각각 "내지 안 보임"·"404"를 유발. 추가 판형 등록 시에도 표지+내지 page를 함께 등록할 것.
2. **Storige Admin → Sites → ShareSnap**:
   - `uploadCallbackUrl` = `https://sharesnap-three.vercel.app/api/storige/webhook` (합성완료 webhook 수신)
   - `allowedOrigins`/`frameAncestors`에 `https://sharesnap-three.vercel.app` 추가(CORS·iframe CSP)

---

## Step 8. 검증

배포 완료 후 `https://sharesnap-three.vercel.app`:
1. 매직링크/카카오 로그인 → `/rooms`
2. 방 생성 → 채팅(실시간) → 사진 업로드 → 갤러리
3. 포토북 만들기 → 편집기에 **공유방 사진이 자동배치된 상태**로 열림(프로덕션 https라 dev의 Mixed Content 없음)
4. 편집완료 → compose → (webhook 등록 시) `pdf_ready`

## 현재 코드 상태 (변경 불필요)

- ✅ 도메인·webhook URL 전부 env/request-origin 기반 — env만 넣으면 동작
- ✅ `thumbnails` 공개 버킷 이미지라 next/image remotePatterns 불필요
- ✅ 보안 헤더 4종, photos 버킷 RLS 강화(010) 적용됨
- ⏳ 운영 직전 권장: 전체 CSP(next.config 주석 초안), TWA assetlinks SHA256(Play Console 발급 후)
