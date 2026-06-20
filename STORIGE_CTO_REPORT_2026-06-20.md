# ShareSnap × Storige 연동 — CTO 진행 보고서

> 작성일: 2026-06-20 · 작성: CTO(Claude) · 대상: 오너(yohan)
> 결론 한 줄: **연동 코드는 사실상 완성·검증 완료. 남은 건 전부 "운영 인프라 결정/세팅"(도메인·레포·Supabase·사이트 origin).** 코드를 더 짤 필요는 거의 없고, 4가지 오너 결정만 풀리면 배포 가능.

---

## 1. 연동 유형 (확정)

ShareSnap = **유형 2 (Storige 편집기 임베드)** — bookmoa-mobile 과 동일 패턴. 자체 편집기 없음, Storige `/embed` iframe + shop-session JWT + compose-mixed 합성 + webhook 수신 + 재편집. ShareSnap 고유: 세션 `metadata.externalPhotos` 사진주입(공유방 사진 탭).

(오너의 최초 "유형 1" 메모는 착오였고, 코드·오너 모두 유형 2로 정정 확인.)

## 2. 현재 상태 — 코드 레벨 거의 완성 ✅

| 항목 | 상태 | 비고 |
|---|---|---|
| shop-session JWT 발급(서버 전용 X-API-Key) | ✅ | `api/storige/session/route.ts` |
| `/embed` iframe + parentOrigin 강제 | ✅ | `storigeClient.ts` `buildEmbedUrl` |
| postMessage 리스너(ready/save/complete/cancel/needAuth/error) | ✅ origin+source 검증 | `useStorigeEmbed.ts` |
| `editor.complete` files/pages 중첩 파싱 | ✅ | `parseEditorResult` |
| compose-mixed 합성 트리거 | ✅ **계약 정확** | `orderId:String(orderSeqno)` = 실제 DTO(`orderId?:string`)와 일치 (Storige 소스 대조 완료) |
| webhook 수신(서명검증+PDF저장) | ✅ **계약 정확** | `synthesis.completed/failed`+`outputFileUrl`+`outputFiles[]` = 실제 `SynthesisWebhookPayload` 일치 |
| download/external 결과 회수 | ✅ | X-API-Key |
| sessionId 영속화 + 재편집 | ✅ | `photobookService.ts` |
| 정수 회원번호 체계 | ✅ | `user_storige_map`(bigint identity) UUID↔정수 1:1, 해시변환 미사용 |
| 타입체크 | ✅ 통과 | `tsc --noEmit` clean |
| 키(site 9a5d4e0c) | ✅ **active 검증** | DB sha256 대조 일치, 유효키 인증 OK |
| **코드 커밋(유실 위험 해소)** | ✅ **2026-06-20 커밋** | `02fd52` 136파일, `.env.local`(실키) 미포함 검증 |

→ **추가로 짤 코드는 사실상 없음**(needAuth 마이그레이션만 선택적 잔여, 우선순위 낮음).

## 3. 무엇이 막고 있나 — 전부 운영 인프라/결정 (코드 아님)

| # | 블로커 | 영향 | 해소 주체 |
|---|---|---|---|
| **B1** | **프로덕션 도메인 미정** | allowedOrigins·uploadCallbackUrl·iframe frame-ancestors 전부 도메인 의존. localhost로는 Storige→ShareSnap 웹훅 도달 불가 | **오너 결정** |
| **B2** | **GitHub 레포 없음** (remote 0, 커밋 보호만 로컬) | 백업·CI·Vercel 배포 불가 | 오너 승인(레포 생성) → 내가 push |
| **B3** | **Supabase 프로덕션 미설정** | user_storige_map·photobook 테이블·마이그레이션(001~009)·service_role 키·webhook DB write 전제 | 오너가 Supabase 프로젝트 생성(또는 내게 위임) |
| **B4** | **Vercel 프로젝트 미생성/미링크** | 배포 타깃·env 주입처 없음 | 오너 승인 → 내가 생성·env·배포 |
| **B5** | **실 포토북 templateSet 미발급** | 현재 dev A4 책자(`STORIGE_DEV_TEMPLATE_SET_ID`) 임시. 실제 포토북 규격(하드커버/페이지/판형) 미정 | 오너 상품 스펙 결정 → 내가 Storige admin 에서 templateSet 발급 |

부가(비차단): `.env.local` 에 실 프로덕션 키 + 프로덕션 URL 이 들어있어 로컬 dev 가 프로덕션 백엔드를 직접 호출함(gitignore 되어 노출은 없음, 인지만). needAuth 게스트→회원 마이그레이션은 배너 안내만(실 이관 로직 없음, memberSeqno 양수라 실害 낮음).

## 4. 권장 진행 순서 (CTO 안)

**Phase 0 — 오너 결정 (이게 풀리면 나머지는 내가 진행)**
1. **프로덕션 도메인 확정** (예: `app.sharesnap.kr`) — B1·B2·B4 의 전제.
2. **포토북 상품 스펙 확정** (판형/페이지수/하드커버 여부) — B5 templateSet 발급 전제.
3. **레포/호스팅 정책**: GitHub org(예: `storigehub/sharesnap`, private) + Vercel + Supabase 프로비저닝 — 내가 대행할지/오너가 직접 만들지.

**Phase 1 — 인프라 (오너 승인 후 내가 대행 가능)**
- Supabase 프로덕션 프로젝트 생성 → 마이그레이션 001~009 적용 → env(URL/anon/service_role) 세팅.
- GitHub 레포 생성 → 현재 커밋 push.
- Vercel 프로젝트 생성·링크 → env(STORIGE_API_KEY·STORIGE_API_URL·NEXT_PUBLIC_STORIGE_EDITOR_URL·Supabase·STORIGE_TEMPLATE_SET_ID) 주입.

**Phase 2 — Storige 측 사이트 설정 (내가 처리)**
- `PUT /sites/9a5d4e0c…` → `allowedOrigins`(CORS) + `uploadCallbackUrl`(웹훅 SSRF allowlist) 에 ShareSnap 도메인 등록.
- `apps/editor/vercel.json` frame-ancestors 에 ShareSnap 도메인 추가 + master push(편집기 재배포). ⚠️ DB만으로는 iframe CSP 적용 안 됨.
- 실 포토북 templateSet 발급 → `STORIGE_TEMPLATE_SET_ID` 주입.

**Phase 3 — 검증 (내가 처리)**
- ShareSnap 프로덕션 배포 → E2E: 임베드→편집→complete→compose-mixed→webhook 수신→download/external. **실제 웹훅이 배포된 도메인에 도달하는지** 확인(현재까지 mock 검증만 됨).

**Phase 4 — 폴리시 (선택)**
- needAuth 게스트→회원 세션 마이그레이션 실 구현.

## 5. 내가 할 수 있는 것 vs 오너가 정할 것

- **내가 즉시 가능**(승인만): Storige 사이트 origin/callback 설정, 편집기 frame-ancestors+배포, templateSet 발급, GitHub push, Vercel/Supabase 프로비저닝 대행, E2E 검증.
- **오너만 결정 가능**: ①도메인 ②상품 스펙 ③레포/인프라 소유·생성 정책. (admin 비밀번호도 현재 내가 모름 — 2026-06-17 변경됨.)

## 6. 핵심 메시지

ShareSnap 은 **"개발"이 막힌 게 아니라 "런칭 결정"이 막혀 있습니다.** 코드는 완성·검증·커밋됐고, 위 Phase 0 세 결정(도메인·상품스펙·인프라정책)만 주시면 Phase 1~3 는 제가 일괄 진행해 실제 배포·E2E까지 끝낼 수 있습니다.
