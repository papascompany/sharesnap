# Storige 편집기 연동 가능성 평가 (2026-06-12)

> 대상: https://editor.papascompany.co.kr/ (자사 Storige, 레포: `/Users/yohan/claude/Bookmoa Storige editor/storige`)
> 질문: ShareSnap Phase 4 자체 Fabric.js 6 편집기 대신 Storige를 연동할 수 있는가?
> **결론: 조건부 가능 — 권장. 단 선결 조건 2건(Storige 측 신규 개발) 합의 필요. 상태: 오너 결정 대기**

## 1. 결론 요약

Storige는 외부 사이트 연동을 위해 **이미 설계·구현·운영 검증(Bookmoa Pilot GA)된 플랫폼**이다.
iframe `/embed` + postMessage v1 + shop-session JWT + 워커 PDF 합성까지 표준 계약이 완성돼 있고,
bookmoa-mobile(React+Vite+Vercel+Supabase — ShareSnap과 거의 동일 스택)이 같은 패턴으로 운영 중이다.

**권장 아키텍처 = 옵션 A: iframe `/embed` + postMessage + ShareSnap 서버 어댑터(`/api/storige/*`)**
- Fabric 5(Storige) vs Fabric 6(ShareSnap 계획) 충돌을 구조적으로 회피 (ShareSnap은 Fabric을 아예 안 씀 — 현재 미설치라 매몰비용 0)
- Storige 회귀가 ShareSnap 빌드를 깨지 않는 가장 느슨한 결합
- CSP frame-ancestors에 `localhost:3000`/`*.vercel.app` 이미 허용 → 개발 착수 즉시 가능

## 2. 평가 매트릭스 (ShareSnap 요구 7개)

| # | 요구사항 | 판정 | 근거 |
|---|---------|------|------|
| 1 | A4/A5/210×210, 300dpi, 블리드3/안전5mm | 부분충족 | 엔진은 임의 mm 판형+블리드3 기본 일치. 단 templateSet 3종 Admin 등록 선행. 캔버스 내부는 150dpi 좌표(혼용 금지) |
| 2 | 표지+내지, 사진/텍스트/클립아트/배경 | 충족 | mode=cover\|content\|both, 스프레드 표지(뒤+책등+앞)+spine 자동계산. 클립아트 등은 Admin 라이브러리 등록 필요 |
| 3 | photobook_pages.fabric_data 직저장 | 부분충족 | 영속성은 성숙(자동저장/재편집). 단 단일 진실 = Storige DB, Fabric 5.5.2+커스텀 속성 40여 개 → **직저장 폐기, session_id 참조 모델로 변경 필요** |
| 4 | Supabase 사진을 편집기로 주입 | **미충족** | 이미지 패널은 로컬 업로드 전용. 외부 사진 주입 API/파라미터 없음 → **Storige 신규 개발 필수 (최대 갭)** |
| 5 | 모바일 터치(핀치줌) | 부분충족 | 터치 선택/이동/핸들 완료. **캔버스 핀치줌 미구현**(MOBILE_TOUCH_UI.md 명시) → 신규 개발 필요 |
| 6 | 300dpi 인쇄 PDF (Phase 5) | 충족 | 클라 SVG→PDF 300dpi → 워커(Bull+Ghostscript) 합성+CMYK 검증 → webhook. 운영 검증 완료 |
| 7 | Supabase Auth(카카오) 연결 | 부분충족 | shop-session JWT 브리지가 정확히 이 용도. 단 memberSeqno가 숫자형 → UUID 매핑 테이블 필요 |

## 3. 선결 조건 (Storige 측 — 이게 합의 안 되면 옵션 D 재검토)

1. **외부 사진 주입 인터페이스 신규 개발** (~3-5일 추정): 공유방 사진 URL 목록을 세션 metadata 또는 postMessage `injectImages`로 받아 이미지 패널에 프리로드
2. **캔버스 핀치줌 + 두 손가락 패닝** (~3-5일 추정): Fabric touch:gesture 기반
3. (운영) ShareSnap 사이트 테넌트 등록(키 발급, frame-ancestors/CORS/웹훅 allowlist), templateSet 3종 등록

## 4. 채택 시 ShareSnap 측 변경

- Phase 4 재정의: 자체 Fabric 6 편집기 폐기 → `src/modules/editor`를 Storige 임베드 호스트로 (iframe 마운트 + postMessage 훅 + 명령 래퍼)
- 서버 어댑터 `/api/storige/*` 신설 (STORIGE_API_KEY는 서버 env 전용): shop-session 발급, 워커 호출, PDF 프록시 다운로드
- 마이그레이션 009+: photobook_orders에 storige_session_id/cover_file_id/content_file_id/synthesis_job_id, fabric_data 직저장 전제 폐기
- profiles에 storige_member_seqno 매핑 + 가상 orderSeqno 채번
- 웹훅 수신 `/api/storige/webhook` (서명은 Base64 — HMAC 아님 주의) → PDF 회수 → Supabase pdfs 버킷
- CLAUDE.md의 "Fabric 6 SSR 규칙"/"dpiConverter 단일 소스" 규칙을 임베드 경로 비적용으로 격리

## 5. 주요 리스크

- **클라이언트 PDF 생성 부하**: 1차 PDF가 브라우저에서 생성됨 — 24페이지에서 180초 워치독 초과 실측 이력. 카톡 인앱/저사양 폰의 다페이지 포토북은 실패 위험 → 페이지 상한 정책 또는 서버 렌더 협의 필요
- **Phase 5 자동편집(사진+코멘트 자동 레이아웃)은 표준 계약 밖**: Storige 템플릿 자동배치 협의 vs ShareSnap이 Fabric 5 포맷 canvasData 생성 vs 범위 축소 — 결정 필요
- 데이터 주권: 편집 원본이 Storige MariaDB(Vultr 단일 노드)에만 존재 — export/백업 계약 권장
- 토큰이 URL 쿼리로 전달(짧은 수명·로그 마스킹 설계 필요), 웹훅 서명 Base64(위조 가능 — allowlist+HTTPS로 보완)

## 6. 옵션 비교 (요약)

| 옵션 | 공수 | 리스크 |
|------|------|--------|
| **A. iframe embed (권장)** | ShareSnap 1.5~2.5주 + Storige 2건(~1-2주) | 낮음~중간 — 운영 검증된 경로 |
| B. IIFE 번들/패키지 임포트 | 2~4주 | 높음 — 격리 없이 결합만 깊어짐, Fabric 5 번들 유입 |
| C. 포크 내장 | 1~2개월+ | 매우 높음 — API/DB/워커 인프라까지 복제 |
| D. 자체 Fabric 6 구현 유지 | 인쇄 품질 파리티까지 현실 4~8주+ | 일정 폭증, 인쇄 시행착오. 단 데이터 주권·모바일 UX 완전 통제 |

## 7. 오너 결정 필요 질문

1. Storige 측 신규 개발 2건(사진 주입, 핀치줌)에 리소스 배정 가능한가? 일정은?
2. Phase 5 자동편집을 어디서 구현? (Storige 자동배치 협의 / ShareSnap이 canvasData 생성 / 범위 축소)
3. 표지를 "앞/뒤 별도"가 아닌 스프레드(뒤+책등+앞 한 캔버스) 모델로 수용 가능한가?
4. 포토북 페이지 수 상한? (모바일 PDF 생성 부하 때문)
5. 편집 데이터가 Storige DB에만 있는 구조 수용? export 계약 요구?
6. ShareSnap 운영 도메인 확정 (frame-ancestors/CORS 등록 선행 필요 — 미정이면 *.vercel.app으로 개발 착수 가능)
