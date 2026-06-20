# Storige 하드커버 포토북 템플릿셋 등록 가이드

> 대상: **Storige 운영자(= 프로젝트 오너, 같은 회사)** — Storige Admin에서 ShareSnap 포토북용 템플릿셋을 등록하는 실행 가이드
> 작성 기준: ShareSnap `src/modules/photobook/services/storigeServer.ts` + Storige 레포(`/Users/yohan/claude/Bookmoa Storige editor/storige`) 실제 코드
> ⚠️ 이 문서에는 **API 키·시크릿 값을 절대 포함하지 않는다.** 키는 서버 환경변수/Vercel env에만 보관한다.
> 추측성 항목은 모두 **"확인 필요"** 로 표기했다.

---

## 1. 요약 — 왜 필요한가 / 누가 / ShareSnap은 무엇을 하나

### 왜 필요한가
ShareSnap은 포토북 편집 시 Storige 편집기(`/embed`)를 iframe으로 띄우고, 백엔드가 편집세션을 만들 때 **`templateSetId`** 를 함께 보낸다. 이 값이 편집기 판형·표지·내지 구성을 결정한다.

현재 dev는 **샘플 템플릿셋**을 쓴다(아래 두 ID가 환경마다 다름에 유의):

| 위치 | 값 | 의미 |
|------|-----|------|
| ShareSnap 코드 기본값 `STORIGE_DEV_TEMPLATE_SET_ID` | `a2cc2939-b76d-41a2-bd41-2d9fba091a24` | `src/modules/shared/lib/constants.ts:49-50` 의 dev 배선용 상수 |
| Storige 레포 샘플 시드 `template_sets.id` | `sample-8x8-book-24p` | `apps/api/migrations/20260508_seed_sample_template_set.sql` (정사각 8×8inch=203.2mm, 24p) |

> 두 ID가 서로 다르다 → **dev 환경의 실제 템플릿셋 ID는 그 환경 DB 기준으로 확인 필요.** 어느 쪽이든 "샘플"이며, 실제 하드커버 포토북용이 아니다.

목표는 운영자가 Admin에서 **실제 하드커버 포토북용 템플릿셋**을 새로 등록하고, 그 ID(`template_sets.id`, varchar(36) UUID)를 ShareSnap에 넘기는 것이다.

### 누가 하나
- **Storige 운영자**(Admin 접근 권한 보유자)가 **Storige Admin**(`admin.papascompany.co.kr` — 도메인 확인 필요)에서 등록한다.
- ShareSnap 개발자는 **코드를 수정하지 않는다.** 등록된 ID를 환경변수에 넣기만 하면 된다.

### ShareSnap 측은 무엇만 하면 되나 (코드 무변경)
ShareSnap은 이미 env 우선순위 로직이 구현돼 있다 (`storigeServer.ts:222-224`):

```ts
export function getTemplateSetId(): string {
  return process.env.STORIGE_TEMPLATE_SET_ID ?? STORIGE_DEV_TEMPLATE_SET_ID;
}
```

→ **운영에서 `STORIGE_TEMPLATE_SET_ID` 환경변수 하나만 새 템플릿셋 ID로 설정하면 끝.** 미설정 시 dev 기본값으로 폴백한다. 세션 생성 라우트(`src/app/api/storige/session/route.ts:142`)가 이 함수를 호출해 `mode:"both"` 와 함께 Storige `/edit-sessions` 로 보낸다.

> 참고: `mode:"both"`(표지+내지 통합 편집)는 **편집세션의 모드**이지 템플릿셋 속성이 아니다. 템플릿셋 등록 시 입력하는 값이 아니며, ShareSnap 코드에 하드코딩돼 있다(`route.ts:141`). 템플릿셋 쪽의 실제 구성은 `editorMode=book` + `type=book` 으로 정한다(§3).

---

## 2. 등록 절차 — Admin 화면별 단계

하드커버 포토북 템플릿셋은 **2단계 작업**이다. 개별 "템플릿(페이지)"을 먼저 만들고, 그것들을 묶어 "템플릿셋"을 등록한다. **순서 의존성**이 있다.

```
[1단계] 개별 템플릿 제작 (표지 spread 1개 + 내지 page 1개 이상)
            ↓  (각 템플릿이 실재해야 셋에 넣을 수 있음)
[2단계] 템플릿셋 생성 + 필드 입력 + templates 배열에 위 템플릿 순서대로 추가
            ↓
[3단계 · 선택] 라이브러리 카테고리 / 도구 메뉴 큐레이션
            ↓
[4단계 · ShareSnap엔 불필요] 상품 연결(product_template_sets)
```

### 2-1단계: 개별 템플릿 제작 (Admin → 템플릿 제작/TemplateEditor)

근거: `apps/admin/src/pages/Templates/TemplateEditor.tsx`

**(A) 표지 스프레드 템플릿** — "새 템플릿 설정" 모달
- **템플릿 이름**: 예 "하드커버 표지 (정사각 210 · 펼침면)"
- **템플릿 타입**: `스프레드 (Spread) - 책모드용` 선택 (`type='spread'`)
  - spread 선택 시 가로/세로 입력란이 숨겨지고, 확인을 누르면 **"스프레드 템플릿 설정" 모달**로 넘어간다(okText="다음").
- **스프레드 템플릿 설정 모달 필드**(`TemplateEditor.tsx:413-505`, 실제 노출되는 필드만):
  | 필드 | 코드명 | 하드커버 포토북 권장값 |
  |------|--------|------------------------|
  | 표지 가로 (mm) | `coverWidthMm` | 내지 width와 동일 (예 210) |
  | 표지 세로 (mm) | `coverHeightMm` | 내지 height와 동일 (예 210) |
  | 날개 포함 | `wingEnabled` (Switch) | 하드커버 보통 **제외(false)** — 보드+래핑 구조. 운영자 확인 필요 |
  | 날개 너비 (mm) | `wingWidthMm` (날개 포함 시만, 30~200) | 미사용 |
  | 초기 책등 너비 (mm) | `initialSpineWidthMm` (선택) | 비워두면 **상품 스펙에서 자동 계산**. 책등은 내지 페이지 수에 따라 동적 변경되므로 비워두는 것이 정석 |
  - ⚠️ **`cutSizeMm`(블리드)·`safeSizeMm`(안전영역)·`dpi`는 이 Admin 모달에 입력란이 없다.** spec의 이 값들은 편집기/스펙 기본값으로 채워진다(샘플 시드는 cutSizeMm=3, safeSizeMm=3, dpi=150). 블리드/안전영역의 실제 운영값을 어디서 확정·주입하는지는 **확인 필요**(샘플은 SQL 시드로 직접 넣음 — `20260508_seed_sample_template_set.sql:55-62`). 블리드는 템플릿셋 레벨 `bleedMm`(기본 3)로도 별도 관리됨(§3).
  - "에디터 열기"를 누르면 빈 canvasData로 Fabric 캔버스가 열린다. 디자인을 그리고 저장하면 `templates` 테이블에 row가 생긴다(저장 시 `canvasData` 필수).

**(B) 내지 페이지 템플릿** — 같은 "새 템플릿 설정" 모달
- **템플릿 타입**: `내지 (Page)` (`type='page'`)
- **가로/세로 (mm)**: 표지 한 면과 동일하게 (예 210 × 210). 10~1000 범위.
- 빈 페이지여도 됨(사용자가 사진을 직접 배치). 디자인 후 저장.

> ⚠️ **책모드 셋 등록의 최소 요건**: 표지 `spread` 1개 + 내지 `page` 1개 이상이 먼저 존재해야 한다.

### 2-2단계: 템플릿셋 생성 + 필드 입력 (Admin → TemplateSets/TemplateSetForm)

근거: `apps/admin/src/pages/TemplateSets/TemplateSetForm.tsx`, 저장 시 `POST /template-sets`. 폼은 접이식(Collapse) "기본 정보 / 페이지 / 템플릿 구성 / 면지 / 표지 / 고급" 섹션으로 구성.

#### 기본 정보
| 화면 라벨 | 코드명 | 하드커버 포토북 권장값 | 비고 |
|-----------|--------|------------------------|------|
| 템플릿셋명 | `name` | 예 "하드커버 포토북 정사각 210" | 필수 |
| 타입 | `type` | **책자 (book)** | 필수. leaflet(리플렛)은 부적합 |
| 에디터 모드 | `editorMode` | **책모드 (book)** | 필수. 스프레드 표지+내지 편집. single은 개별 페이지 모드 |
| 가로/세로 (mm) | `width` / `height` | 내지 한 면 판형 (예 210 × 210) | **표지 spread의 coverWidthMm/HeightMm 및 내지 page의 width/height와 정확히 일치해야 서버 검증 통과** (`template-sets.service.ts` 판형 일치 검증, 불일치 시 BadRequestException) |

#### 페이지
| 화면 라벨 | 코드명 | 권장값 | 비고 |
|-----------|--------|--------|------|
| 내지 추가 허용 | `canAddPage` | true | 고객이 내지 장수 조절 |
| 최소/최대 페이지 | `pageCountMin`/`pageCountMax` → `pageCountRange:[min,max]` | 운영자 확정 필요 | 폼은 min/max 2개 입력을 배열로 변환 제출. 하드커버는 짝수/4의배수 권장(확인 필요) |

#### 템플릿 구성 (`templates`: `TemplateRef[]` = `{templateId, required}` 순서 배열)
- 우측/하단 패널에서 2-1단계에서 만든 템플릿을 골라 추가하고 순서를 정렬, `required`(필수 페이지) 토글.
- **책모드 검증 규칙**(`TemplateSetForm.tsx:361-389` + 서버 `template-sets.service.ts`):
  - **스프레드(spread) 템플릿 정확히 1개 필수** — 0개 또는 2개 이상이면 "책모드는 스프레드 템플릿이 정확히 1개 필요합니다." 에러
  - **날개/표지/책등(wing/cover/spine) 타입 사용 불가** — "책모드에서는 날개/표지/책등 템플릿을 사용할 수 없습니다." (이들은 spread에 통합됨)
  - **내지(page) 최소 1개**
  - 권장 구성: `[{표지 spread, required:true}, {내지 page, required:false} × N]`

#### 면지 (Endpaper) — `endpaperConfig`
| 화면 라벨 | 코드명 | 권장값 |
|-----------|--------|--------|
| 면지 사용 | `useEndpaper` | 하드커버 포토북은 보통 사용 (확인 필요) |
| 앞/뒤 면지 개수 | `endpaperFrontCount`/`endpaperBackCount` (0~6) | 앞/뒤 1~2장 |
| 앞/뒤 면지 편집 가능 | `endpaperFrontEditable`/`endpaperBackEditable` | 편집 불가면 단색 빈 면지 |

#### 표지
| 화면 라벨 | 코드명 | 권장값 |
|-----------|--------|--------|
| 표지 편집 가능 | `coverEditable` (기본 true) | true(고객 직접 디자인) / false(사전인쇄 레더커버 — `coverPreviewImage` 필요) |
| 표지 미리보기 이미지 | `coverPreviewImage` | `coverEditable=false`일 때만 의미 |

#### 고급 (인쇄/출력)
| 화면 라벨 | 코드명 | 기본/권장값 | 비고 |
|-----------|--------|-------------|------|
| 블리드 (사방 mm) | `bleedMm` | 3 (0~50) | 하드커버 인쇄 권장 3mm. 표지 래핑 고려 시 운영자가 더 크게 가능 |
| 재단선 마커 | `cropMarkEnabled` | false | 인쇄소 요구 시 true |
| 업로드 허용오차 (mm) | `sizeToleranceMm` | 0.2 | 업로드 PDF 사이즈 검증 |
| 색 처리 방식 | `colorMode` | rgb / **cmyk** | ⚠️ cmyk는 **"의도 저장"만** — 워커의 실제 RGB→CMYK 변환은 미연결(스테이징). §6 참조 |
| PDF 생성 방식 | `pdfOutputMode` | duplex-merged | 책(spread) 셋은 compose-mixed가 표지/내지 분리 2파일을 자동 처리하므로 영향 적음 |

> 서버 **필수 필드는 `name`, `type`, `width`, `height` 4개뿐**(`template-set.dto.ts`). 나머지는 모두 optional이며 서버가 기본값을 적용한다(bleedMm=3, cropMarkEnabled=false, pdfOutputMode=duplex-merged 등). 폼 초기값: type=BOOK, editorMode=SINGLE, canAddPage=true, pageCountMin=10/Max=100, colorMode=rgb, bleedMm=3, sizeToleranceMm=0.2 (`TemplateSetForm.tsx:563-576`). **하드커버는 editorMode를 SINGLE→BOOK으로 바꿔야 함에 주의.**

### 2-3단계: 라이브러리 카테고리 / 도구 메뉴 (선택)
- **노출 라이브러리 카테고리** `libraryCategoryIds` (멀티셀렉트): 이 편집기에서 보여줄 에셋(배경/도형/클립아트/프레임/폰트) 카테고리. 비우면 전역(전부 노출).
- **도구 메뉴 직접 설정** `customizeMenus` + `enabledMenus`: 끄면 전체 노출(서버에 null 저장). 켜면 체크한 메뉴만. 키: `UPLOAD/CLIPPING/TEMPLATE/IMAGE/TEXT/SHAPE/BACKGROUND/FRAME/SMART_CODE/EDIT/AI`. 포토북 권장 예: `UPLOAD, IMAGE, TEXT, SHAPE, BACKGROUND, CLIPPING, EDIT`.
- ⚠️ 라이브러리 필터링/메뉴 화이트리스트의 **에디터 실반영은 단계적 적용 중**(설정 저장 우선) — 운영 확인 필요.

### 2-4단계: 상품 연결 (product_template_sets) — **ShareSnap엔 불필요**
- `POST /product-template-sets`: `sortcode`(Bookmoa 상품코드), `prdtStanSeqno`(규격번호, 비우면 전규격), `templateSetId`, `displayOrder`, `isDefault`.
- 이건 **Bookmoa 쇼핑몰 상품페이지**에서 어떤 템플릿셋을 노출할지 매핑용이다. ShareSnap은 `templateSetId`를 직접 전달하므로 **이 연결 없이도 동작**한다. 동일 셋을 Bookmoa 쇼핑몰에도 노출하려면 그때 추가.

---

## 3. 하드커버 포토북 권장 스펙 표

조사된 **실제 필드명** 기준. 값은 출발점이며 §6의 오너 결정으로 확정한다.

| 항목 | 위치/필드 | 권장값 | 비고 |
|------|-----------|--------|------|
| 셋 타입 | `template_sets.type` | `book` | 책자 |
| 에디터 모드 | `template_sets.editorMode` | `book` | 스프레드 편집 |
| 판형 가로×세로 | `template_sets.width/height` (mm) | 정사각 210×210 또는 200×200(8inch=203.2) / 세로 A4 210×297 / 가로 297×210 중 택1 | 자유 입력. **표지 spread·내지 page와 일치 필수** |
| 표지(스프레드) | 별도 template `type='spread'` | coverWidthMm=내지 width, coverHeightMm=내지 height | 앞표지+책등+뒤표지 단일 캔버스 |
| 날개 | spread spec `wingEnabled` | false (하드커버) | 확인 필요 |
| 책등 너비 | spread spec `spineWidthMm` (`initialSpineWidthMm` 비움) | **동적 계산** | 공식: `max(0, (pageCount/2) × paperThickness + bindingMargin)`. 하드커버 bindingMargin=**2.0mm**(`spine-seed.service.ts:84-86` code='hardcover','양장제본') |
| 내지 | 별도 template `type='page'` | width/height=판형 | N장 반복(`templates` 배열) |
| 페이지 범위 | `template_sets.pageCountRange` (배열) | 운영자 확정 | 짝수/4의배수 권장(확인 필요). hardcover 제본엔 min/max 제약이 비어 있어 운영자가 정책 설정 |
| 블리드 | `template_sets.bleedMm` | 3 | 사방 mm |
| 안전영역 | spread spec `safeSizeMm` / 텍스트 보호 가이드 | 3~15 (텍스트 보호 15 권장) | ⚠️ Admin 폼에 직접 입력란 없음(§2-1 확인 필요) |
| 재단선 마커 | `template_sets.cropMarkEnabled` | false(인쇄소 요구 시 true) | |
| 업로드 허용오차 | `template_sets.sizeToleranceMm` | 0.2 | |
| 색공간 | `template_sets.colorMode` | rgb (cmyk는 의도만) | §6 |
| DPI | spread spec `dpi` / 워커 권장 | 300 권장(샘플 시드는 150) | 워커 `RECOMMENDED_DPI=300`. 편집기 산출 PDF는 dpi 300으로 px→mm 통일. spec dpi 주입 경로 확인 필요 |
| 면지 | `template_sets.endpaperConfig` | 앞/뒤 1~2장 | 확인 필요 |
| 표지 편집 | `template_sets.coverEditable` | true | 레더커버면 false+coverPreviewImage |
| PDF 출력 | `template_sets.pdfOutputMode` | duplex-merged(기본) | 책 셋은 표지/내지 분리 2파일 자동 |
| 편집 모드(세션) | ShareSnap `mode` | `both` | **템플릿셋 필드 아님** — ShareSnap 코드 고정 |
| 이미지 프레임/자동배치 | (없음) | — | §4 참조. Storige 미구현 |

---

## 4. 이미지 프레임 / 자동배치 결정

### 현재 상태: Storige에 "사진 자리(프레임/플레이스홀더)"·"자동 채움" 기능이 없다
- 코드 전체에 `placeholder/imageFrame/autoFill/autoPlace/photoSlot/frameSlot` 개념이 없다(조사 결과). 즉 **"빈 칸 N개에 공유방 사진을 순서대로 자동 배치"하는 기능은 미구현**이다.
- 따라서 템플릿은 **빈 캔버스(사용자 수동 배치)** 모델이다. 표지/내지 템플릿에 디자인 요소(배경·텍스트 틀)는 넣을 수 있지만, "여기에 사진 들어감" 슬롯은 정의할 수 없다.

### ShareSnap `externalPhotos`와의 관계
- ShareSnap이 `/edit-sessions` 생성 시 `metadata.externalPhotos`(공유방 사진 URL 목록)를 주입한다(`storigeServer.ts:168` `metadata: { externalPhotos }`).
- 이 사진들은 편집기 이미지 패널의 **"공유방 사진" 탭**에 뜨고, **사용자가 1탭/드래그해 현재 캔버스에 직접 배치**한다. 이것이 사진을 책에 넣는 **유일한 경로**다(자동 배치 아님).
- 즉 템플릿셋 등록 시 externalPhotos를 위해 설정할 필드는 **없다** — 세션 metadata로 별도 주입되므로 템플릿셋 스펙과 무관하다.

### 결정 사항 (D3 후속 후보)
ShareSnap이 "공유방 사진 자동 포토북 편집"(사진을 빈 페이지에 자동 채움) UX를 원한다면 셋 중 하나를 택해야 한다 — **현재 미구현이므로 D3 후속 과제로 명시**:
1. **(현행 수용)** 사용자가 편집기에서 수동 배치 — 추가 개발 0
2. **ShareSnap이 canvasData 생성** — Fabric 5 포맷 canvasData를 ShareSnap이 만들어 세션에 주입(포맷·커스텀 속성 호환성 검증 필요)
3. **Storige 신규 기능** — 프레임/자동배치 엔진을 Storige에 신규 개발(별도 발주)

---

## 5. 등록 후 ShareSnap 연결

### 5-1. 새 템플릿셋 ID 확보
2단계 완료 후 생성된 `template_sets.id`(varchar(36) UUID)를 복사한다. Admin 템플릿셋 목록/상세에서 확인.

### 5-2. `STORIGE_TEMPLATE_SET_ID` 설정 (코드 무변경)
ShareSnap은 이 env 하나만 새 ID로 설정하면 된다(`getTemplateSetId()` 우선순위).

**로컬(.env.local)** — `.env.local.example`에 이미 자리 있음(주석 처리):
```
# 편집세션 생성 시 사용할 포토북 templateSet ID
STORIGE_TEMPLATE_SET_ID=<새-템플릿셋-UUID>
```

**Vercel(운영/프리뷰 env)**:
```bash
# 값 입력은 대화형으로 — 시크릿 아님이지만 콘솔/CLI 어느 쪽이든 가능
vercel env add STORIGE_TEMPLATE_SET_ID production
vercel env add STORIGE_TEMPLATE_SET_ID preview   # 필요 시
```
또는 Vercel 대시보드 → Project → Settings → Environment Variables.

> 관련 Storige 연동 env(이미 `.env.local.example`에 정의됨, **값은 시크릿이라 여기 미기재**): `STORIGE_API_URL`, `STORIGE_API_KEY`(서버 전용·NEXT_PUBLIC 금지), `NEXT_PUBLIC_STORIGE_EDITOR_URL`, `NEXT_PUBLIC_APP_URL`. `STORIGE_API_KEY` 미설정 시 `/api/storige/*`가 503 `STORIGE_NOT_CONFIGURED` 반환.

### 5-3. 검증 방법
1. env 반영 후 ShareSnap 재시작/재배포.
2. 포토북 주문 컨텍스트에서 `POST /api/storige/session` 호출(앱 내 "편집하기" 진입). 응답 200 `{ sessionId, accessToken, refreshToken, expiresIn }` 확인.
   - 서버 로그/네트워크에서 `/edit-sessions` 요청 body의 `templateSetId`가 **새 UUID**인지 확인(dev 기본값 `a2cc2939…`가 아니어야 함).
3. 프론트가 `/embed?sessionId=…`로 편집기를 연다 → **하드커버 판형(스프레드 표지 + 내지)** 으로 로드되는지, 이미지 패널에 **"공유방 사진" 탭**이 보이는지 육안 확인.
4. (선택) 편집 완료 → compose-mixed → 웹훅으로 표지/내지 분리 2-PDF가 정상 생성되는지 확인(기존 스모크 테스트 경로).

> 주의: ShareSnap 코드의 `STORIGE_DEV_TEMPLATE_SET_ID`(`constants.ts`)는 **수정하지 않는다.** env override만으로 충분하다.

---

## 6. 오너 결정 필요 항목

등록 전에 운영자(오너)가 확정해야 하는 미정 항목 — 인쇄소(Bookmoa) 사양서와 대조 필요.

1. **판형 확정**: 정사각(210×210/200×200) vs 세로 A4(210×297) vs 가로(297×210). 이 값이 표지 spread·내지 page 제작 판형을 고정한다.
2. **내지 페이지 범위(`pageCountRange`)**: 최소/최대 + 짝수·4의배수 강제 여부. hardcover 제본엔 코드상 min/max 제약이 비어 있어 운영자가 직접 정책을 세워야 함.
3. **제본/책등**: 하드커버(양장, bindingMargin=2.0mm) 확정. 책등 초기값(`initialSpineWidthMm`)을 비워 자동 계산에 맡길지, 날개(`wingEnabled`) 사용 여부.
4. **블리드/안전영역/DPI 주입 경로**: Admin spread 모달에 cutSizeMm/safeSizeMm/dpi 입력란이 없음. 실제 운영값(블리드 3, 안전영역 3~15, dpi 300)을 어디서 확정·주입하는지 **확인 필요**(샘플은 SQL 시드로 직접 넣음). 템플릿셋 `bleedMm`(폼 입력 가능)과의 관계 정리.
5. **CMYK 출력**: `colorMode='cmyk'`는 의도 저장만 되고 워커 실제 변환은 미연결(스테이징). 인쇄 정합을 (a) 인쇄소 RIP 변환 운영으로 갈지, (b) 워커 변환 파이프라인을 별도 발주할지 결정.
6. **사진 자동배치 여부**: §4의 3안 중 택1. 현행(수동 배치) 수용 vs 자동편집 구현(D3 후속).
7. **면지/표지 편집 정책**: `endpaperConfig`(면지 장수/편집 가능), `coverEditable`(자유 디자인 vs 레더커버) 상품 기획 확정.
8. **에셋/메뉴 큐레이션**: `libraryCategoryIds`, `enabledMenus` 범위. 단 에디터 실반영이 단계적 적용 중임을 인지.
9. **상품 연결 여부**: ShareSnap엔 불필요. 동일 셋을 Bookmoa 쇼핑몰에도 노출하려면 `sortcode` 매핑 추가.
10. **등록 환경 확인**: Admin 도메인(`admin.papascompany.co.kr` — 확인 필요)·접속 권한, 등록 대상 DB가 운영을 가리키는지, `STORIGE_API_URL`/`NEXT_PUBLIC_STORIGE_EDITOR_URL`이 운영 엔드포인트인지 확인.

---

## 부록: 핵심 코드 근거 (읽기 전용 확인)

| 사실 | 파일 |
|------|------|
| `getTemplateSetId()` = `STORIGE_TEMPLATE_SET_ID ?? STORIGE_DEV_TEMPLATE_SET_ID` | `sharesnap/src/modules/photobook/services/storigeServer.ts:222-224` |
| dev 기본 ID `a2cc2939…` | `sharesnap/src/modules/shared/lib/constants.ts:49-50` |
| 세션 생성 시 `mode:"both"` + `getTemplateSetId()` 전송 | `sharesnap/src/app/api/storige/session/route.ts:140-146` |
| `metadata.externalPhotos` 주입 | `sharesnap/src/modules/photobook/services/storigeServer.ts:168` |
| Storige 연동 env 자리(시크릿 값 제외) | `sharesnap/.env.local.example:8-14` |
| 템플릿셋 폼/초기값/검증 | `storige/apps/admin/src/pages/TemplateSets/TemplateSetForm.tsx` (초기값 563-576, 책모드 검증 361-389) |
| 스프레드 설정 모달 필드 | `storige/apps/admin/src/pages/Templates/TemplateEditor.tsx:413-505` |
| 하드커버 제본 정의(margin 2.0mm) | `storige/apps/api/src/database/seeds/spine-seed.service.ts:83-88` |
| 샘플 포토북 시드(8×8inch, spread+page) | `storige/apps/api/migrations/20260508_seed_sample_template_set.sql` |

---

## 부록 B: 210×210 4P 시드 적용

등록 API(`POST /template-sets`, `POST /templates`)는 `X-API-Key` 가 **Admin 전용(401)** 이라 외부에서 호출할 수 없다. 따라서 ShareSnap 포토북용 **정사각 210×210mm 하드커버 4P 템플릿셋**은 **SQL 시드로 직접 주입**한다. 아래 시드는 표지 spread 1개 + 내지 page 4개를 묶은 책모드(book) 셋을 고정 ID 로 만든다.

### B-1. 시드 파일

- 경로: **`sharesnap/docs/storige-seed-210x210-photobook.sql`**
- 문법: MariaDB, `INSERT ... ON DUPLICATE KEY UPDATE` (재실행 안전 / idempotent)
- 고정 ID (컬럼명은 엔티티 `template.entity.ts` / `template-set.entity.ts` 기준):
  | 대상 | 테이블 | id | 핵심 컬럼 |
  |------|--------|-----|-----------|
  | 표지 스프레드 | `templates` | `photobook-spread-cover-210` | `type='spread'`, `width=420.2`, `height=210`, `editable=true`, `deleteable=false`, `spread_config` (coverWidthMm=210, coverHeightMm=210, spineWidthMm=0.2, wingEnabled=false, cutSizeMm=3, safeSizeMm=5, dpi=300) |
  | 내지 | `templates` | `photobook-page-210` | `type='page'`, `width=210`, `height=210`, `editable=true`, `deleteable=true`, `spread_config=NULL` |
  | 템플릿셋 | `template_sets` | `photobook-210-book-4p` | `type='book'`, `editor_mode='book'`, `width=210`, `height=210`, `can_add_page=true`, `page_count_range=[4,8,...,40]`, `templates`=표지1(required)+내지4, `bleed_mm=3`, `color_mode='rgb'`, `cover_editable=true`, `enabled_menus=NULL` |

> **"4P" 의미**: 여기서 4P = "내지 4페이지" 단위. 셋은 표지 spread 1 + 내지 page 4(기본 4면)로 구성되고, `can_add_page=true` + `page_count_range=[4,8,…,40]` 이라 고객이 **4페이지 단위로 증감**할 수 있다.
>
> ⚠️ **책등(spineWidthMm=0.2)·총폭(width=420.2)은 정적 고정값이 아니다.** 빈 시안 캔버스의 표기용 초기값이며, 실제 책등 폭은 주문 페이지수/용지/제본(하드커버 bindingMargin=2.0mm)에 따라 편집기·워커가 `max(0, (pageCount/2)×paperThickness + bindingMargin)` 로 동적 계산한다. 서버 검증(`validateSpreadAgainstAuthority`)도 표지 기하(cover/wing)만 대조하고 책등/총폭은 비교하지 않는다.

### B-2. 적용 명령

**(a) docker mariadb 직접 주입** (운영 DB 이름/유저는 환경에 맞게 — storige 레포 기준 db=storige, user=storige):
```bash
docker-compose exec mysql \
  mariadb -ustorige -p storige < \
  docs/storige-seed-210x210-photobook.sql
```

**(b) Admin 수동 등록**: 같은 컬럼값으로 Admin 폼에서 등록. 단 Admin spread 모달엔 `cutSizeMm`/`safeSizeMm`/`dpi` 입력란이 없어(§2-1), spread spec 의 이 값들(cutSize=3, safeSize=5, dpi=300)을 정확히 맞추려면 (a) SQL 주입이 정석이다.

### B-3. env 설정 (ShareSnap, 코드 무변경)

시드 적용 후 ShareSnap 은 env 하나만 설정한다(`getTemplateSetId()` 우선순위 — §5-2):
```bash
# 로컬 sharesnap/.env.local
STORIGE_TEMPLATE_SET_ID=photobook-210-book-4p

# Vercel
vercel env add STORIGE_TEMPLATE_SET_ID production
vercel env add STORIGE_TEMPLATE_SET_ID preview   # 필요 시
```
미설정 시 dev 기본값(`a2cc2939…`)으로 폴백한다 — 반드시 설정해야 새 셋이 적용된다.

### B-4. 검증

1. **DB 행 확인** (시드 직후):
   ```sql
   SELECT id, type, width, height FROM templates
     WHERE id IN ('photobook-spread-cover-210','photobook-page-210');
   SELECT id, type, editor_mode, width, height, can_add_page,
          page_count_range, cover_editable, bleed_mm, color_mode
     FROM template_sets WHERE id = 'photobook-210-book-4p';
   ```
   → spread 1행(420.2×210) + page 1행(210×210), 셋 1행(book/book, 210×210)이 나와야 한다.
2. **세션 생성**: ShareSnap "편집하기" 진입 → `POST /api/storige/session` 200 응답. 서버 로그/네트워크에서 `/edit-sessions` body 의 `templateSetId` 가 `photobook-210-book-4p` 인지 확인(dev 기본값 `a2cc2939…` 가 아니어야 함).
3. **편집기 로드**: `/embed?sessionId=…` 가 **정사각 210 스프레드 표지 + 내지** 로 열리고, 이미지 패널에 **"공유방 사진" 탭**이 보이는지 육안 확인.
4. **재실행 안전성**: 시드를 한 번 더 실행해도 `ON DUPLICATE KEY UPDATE` 로 동일 결과(에러/중복 없음)인지 확인.
5. **롤백** (필요 시):
   ```sql
   DELETE FROM template_sets WHERE id = 'photobook-210-book-4p';
   DELETE FROM templates     WHERE id IN ('photobook-spread-cover-210','photobook-page-210');
   ```
