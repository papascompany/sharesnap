-- ============================================================
-- ⚠️ [2026-06-22] 이 시드는 적용되지 않았고 운영도 사용하지 않는다.
--   운영은 Storige Admin에 등록된 실제 셋을 쓴다:
--     id   = 2f312032-e3d2-4623-8013-231ce1984400
--     name = "sharesnap basic 210 H/C" (type=book, 표지 spread 458×238, canAddPage)
--   Vercel STORIGE_TEMPLATE_SET_ID = 위 UUID. 아래 슬러그 'photobook-210-book-4p'를
--   env에 넣으면 편집기가 404("템플릿셋을 찾을 수 없습니다")로 열리지 않는다.
--   이 파일은 "추가 판형을 SQL로 직접 심을 때"의 구조 참고용으로만 보존한다.
-- ============================================================
-- Seed: 210×210mm 정사각 하드커버 포토북 템플릿셋 (4P 단위)
--       표지 spread 1 + 내지 page 4 = 책모드(book) 셋
-- ============================================================
-- 사유: ShareSnap 포토북 편집세션이 사용할 "실제 하드커버 포토북용"
--      템플릿셋을 SQL 시드로 직접 등록한다.
--      등록 API(POST /template-sets, POST /templates)는 X-API-Key 가
--      Admin 전용(401)이라 외부에서 호출 불가 → SQL 시드로만 주입 가능.
--
-- ID 고정 (idempotent — 재실행/재배포 안전):
--   - templates:     photobook-spread-cover-210 (표지 spread)
--                    photobook-page-210         (내지 page)
--   - template_sets: photobook-210-book-4p      (책모드 셋)
--   ※ ShareSnap STORIGE_TEMPLATE_SET_ID 가 이 셋 ID 를 직접 참조한다. 변경 금지.
--
-- "4P" 의미:
--   여기서 4P = "내지 4페이지" 단위를 뜻한다. 이 셋은 표지 spread 1개 +
--   내지 page 템플릿 4개로 구성되며(=기본 내지 4면), can_add_page=true 이고
--   page_count_range 가 [4,8,12,...,40] 이라 고객이 4페이지 단위로 늘릴 수 있다.
--   (책등 폭은 정적이 아니라 주문 페이지수/용지에 따라 편집기/워커가 동적 계산)
--
-- 적용 방법 (둘 중 하나):
--   (a) docker mariadb 직접 주입
--       docker-compose exec mysql \
--         mariadb -ustorige -p storige < \
--         docs/storige-seed-210x210-photobook.sql
--       (DB 이름/유저는 운영 환경에 맞게. storige 레포 기준 db=storige, user=storige)
--   (b) Storige Admin 운영자가 동일 컬럼값으로 수동 등록
--       (Admin 폼엔 cutSize/safeSize/dpi 입력란이 없어 spread spec 일부는
--        이 SQL 처럼 직접 주입해야 정확히 일치 — docs/storige-templateset-registration.md §2-1 참조)
--
-- 적용 후 ShareSnap 설정 (코드 무변경):
--   STORIGE_TEMPLATE_SET_ID='photobook-210-book-4p'
--     - 로컬:  sharesnap/.env.local
--     - Vercel: vercel env add STORIGE_TEMPLATE_SET_ID production
--   ShareSnap getTemplateSetId() 가 이 env 를 우선 사용한다(미설정 시 dev 기본값 폴백).
--
-- 안전성:
--   • INSERT ... ON DUPLICATE KEY UPDATE 로 재실행 안전(idempotent).
--   • id 고정 신규 row 만 추가/갱신 → 다른 데이터 무영향.
--   • 컬럼명은 엔티티 기준(template.entity.ts / template-set.entity.ts):
--       templates:     id,name,thumbnail_url,type,width,height,editable,deleteable,
--                      canvas_data,spread_config,is_deleted,is_active
--       template_sets: id,name,thumbnail_url,type,width,height,can_add_page,
--                      page_count_range,templates,editor_mode,enabled_menus,
--                      cover_editable,bleed_mm,color_mode,is_deleted,is_active
--
-- 롤백:
--   DELETE FROM template_sets WHERE id = 'photobook-210-book-4p';
--   DELETE FROM templates     WHERE id IN ('photobook-spread-cover-210','photobook-page-210');
-- ============================================================

-- ----------------------------------------------------------------
-- (a) 표지 스프레드 템플릿 (앞표지 + 책등 + 뒤표지 단일 캔버스)
--
--     크기 표기: width = 420.2 mm = 210(앞) + 210(뒤) + 0.2(책등 가정값)
--                height = 210 mm
--
--     ⚠️ 책등(spineWidthMm)·총폭(totalWidthMm)은 정적 고정값이 아니다.
--        실제 책등 폭 = max(0, (pageCount/2) × paperThickness + bindingMargin) 로
--        주문 페이지수/용지/제본(하드커버 bindingMargin=2.0mm)에 따라 편집기·워커가
--        동적 계산한다. 여기 0.2mm 와 420.2mm 는 "빈 시안 캔버스" 의 표기용
--        초기값일 뿐이며, 서버 검증은 표지 기하(coverWidthMm/coverHeightMm/wing)만
--        대조하고 책등/총폭은 비교하지 않는다(validateSpreadAgainstAuthority).
--
--     canvas_data: 빈 시안(objects 없음) → 편집기 SpreadPlugin 이 가이드/워크스페이스
--                  동적 생성. width/height 는 mm 기준 표기.
-- ----------------------------------------------------------------
INSERT INTO templates (
  id, name, thumbnail_url, type, width, height,
  editable, deleteable, canvas_data, spread_config, is_deleted, is_active
) VALUES (
  'photobook-spread-cover-210',
  '하드커버 포토북 표지 (정사각 210 · 펼침면)',
  NULL,
  'spread',
  420.2,
  210,
  TRUE, FALSE,
  JSON_OBJECT(
    'version', '5.5.2',
    'objects', JSON_ARRAY(),
    'width', 420.2,
    'height', 210
  ),
  JSON_OBJECT(
    'version', 1,
    'spec', JSON_OBJECT(
      'coverWidthMm', 210,
      'coverHeightMm', 210,
      'spineWidthMm', 0.2,
      'wingEnabled', FALSE,
      'wingWidthMm', 0,
      'cutSizeMm', 3,
      'safeSizeMm', 5,
      'dpi', 300
    ),
    'regions', JSON_ARRAY(),
    'totalWidthMm', 420.2,
    'totalHeightMm', 210
  ),
  FALSE, TRUE
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  width = VALUES(width),
  height = VALUES(height),
  editable = VALUES(editable),
  deleteable = VALUES(deleteable),
  canvas_data = VALUES(canvas_data),
  spread_config = VALUES(spread_config),
  is_deleted = FALSE,
  is_active = TRUE;

-- ----------------------------------------------------------------
-- (b) 내지 페이지 템플릿 (정사각 210 × 210 mm)
--     빈 시안 → 사용자가 공유방 사진을 직접 배치(자동 채움 미구현).
--     deleteable=true → 고객이 내지 페이지 삭제 가능.
--     spread_config = NULL → page 타입은 스프레드 설정 없음.
-- ----------------------------------------------------------------
INSERT INTO templates (
  id, name, thumbnail_url, type, width, height,
  editable, deleteable, canvas_data, spread_config, is_deleted, is_active
) VALUES (
  'photobook-page-210',
  '하드커버 포토북 내지 (정사각 210)',
  NULL,
  'page',
  210,
  210,
  TRUE, TRUE,
  JSON_OBJECT(
    'version', '5.5.2',
    'objects', JSON_ARRAY(),
    'width', 210,
    'height', 210
  ),
  NULL,
  FALSE, TRUE
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  width = VALUES(width),
  height = VALUES(height),
  editable = VALUES(editable),
  deleteable = VALUES(deleteable),
  canvas_data = VALUES(canvas_data),
  spread_config = VALUES(spread_config),
  is_deleted = FALSE,
  is_active = TRUE;

-- ----------------------------------------------------------------
-- (c) 템플릿셋 — 책모드(book), 정사각 210×210
--     구성: 표지 spread(required=true) 1 + 내지 page(required=false) 4
--
--     책모드 검증 규칙(template-sets.service.ts) 충족:
--       • spread 템플릿 정확히 1개
--       • wing/cover/spine 타입 미사용
--       • page 최소 1개
--       • width/height 가 spread.coverWidthMm/HeightMm 및 page.width/height 와 일치
--         (모두 210 → BadRequestException 미발생)
--
--     can_add_page=true + page_count_range=[4,8,...,40] → 4페이지 단위 증감.
--     cover_editable=true → 고객이 표지 직접 디자인(레더커버 아님).
--     bleed_mm=3 → 사방 블리드 3mm.  color_mode='rgb' → RGB 유지(기본).
--     enabled_menus=NULL → 모든 도구 메뉴 노출.
-- ----------------------------------------------------------------
INSERT INTO template_sets (
  id, name, thumbnail_url, type, width, height,
  can_add_page, page_count_range, templates, editor_mode, enabled_menus,
  cover_editable, bleed_mm, color_mode, is_deleted, is_active
) VALUES (
  'photobook-210-book-4p',
  '하드커버 포토북 정사각 210 (4P)',
  NULL,
  'book',
  210,
  210,
  TRUE,
  JSON_ARRAY(4, 8, 12, 16, 20, 24, 28, 32, 36, 40),
  JSON_ARRAY(
    -- 표지 스프레드 (1) — required (반드시 편집)
    JSON_OBJECT('templateId', 'photobook-spread-cover-210', 'required', TRUE),
    -- 내지 4면 — 같은 templateId 반복(각 페이지가 독립 캔버스로 로드됨)
    JSON_OBJECT('templateId', 'photobook-page-210', 'required', FALSE),
    JSON_OBJECT('templateId', 'photobook-page-210', 'required', FALSE),
    JSON_OBJECT('templateId', 'photobook-page-210', 'required', FALSE),
    JSON_OBJECT('templateId', 'photobook-page-210', 'required', FALSE)
  ),
  'book',
  NULL,
  TRUE,
  3,
  'rgb',
  FALSE, TRUE
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  width = VALUES(width),
  height = VALUES(height),
  can_add_page = VALUES(can_add_page),
  page_count_range = VALUES(page_count_range),
  templates = VALUES(templates),
  editor_mode = VALUES(editor_mode),
  enabled_menus = VALUES(enabled_menus),
  cover_editable = VALUES(cover_editable),
  bleed_mm = VALUES(bleed_mm),
  color_mode = VALUES(color_mode),
  is_deleted = FALSE,
  is_active = TRUE;

-- ============================================================
-- 검증 쿼리 (적용 후 수동 확인용):
--   SELECT id, type, width, height FROM templates
--     WHERE id IN ('photobook-spread-cover-210','photobook-page-210');
--   SELECT id, type, editor_mode, width, height, can_add_page,
--          page_count_range, cover_editable, bleed_mm, color_mode
--     FROM template_sets WHERE id = 'photobook-210-book-4p';
-- ============================================================
