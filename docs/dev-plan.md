# 📸 ShareSnap - 사진 공유 & 포토북 서비스
## 개발 스펙 및 멀티에이전트 오토 파이프라인 계획서

---

## 1. 서비스 개요

### 1.1 서비스 정의
여행·모임 참여자들이 각자 촬영한 사진을 **공유방(채팅방 형식)**에 업로드하여 공유하고, 모인 사진으로 **사진 인화 주문** 또는 **AI 자동 편집 포토북 주문**까지 연결되는 End-to-End 사진 공유 플랫폼

### 1.2 핵심 기능 요약

| 구분 | 기능 | 설명 |
|------|------|------|
| **공유** | 공유방 개설 | 링크 기반 초대, 채팅방 형식 UI |
| **공유** | 사진 업로드/공유 | 다중 사진 업로드, 코멘트 작성 |
| **공유** | 갤러리 뷰 | 모인 사진 타임라인/그리드 보기 |
| **주문** | 사진 인화 주문 | 개별 사진 선택 → 인화 주문 |
| **주문** | 포토북 자동편집 | 사진+코멘트 매칭 → 1페이지 1사진 자동 레이아웃 |
| **편집** | 표지 커스텀 | Fabric.js 기반 앞표지/뒷표지 편집 |
| **편집** | 내지 커스텀 | 자동편집 결과물 개별 페이지 수정 |
| **생성** | PDF 생성 | 300dpi 고해상도 PDF 출력 |
| **관리** | 편집 리소스 관리 | 폰트, 클립아트, 배경이미지 서버 관리 |

---

## 2. 기술 스택

### 2.1 Frontend
```
Framework       : Next.js 14 (App Router)
Language        : TypeScript
Styling         : Tailwind CSS + shadcn/ui
Canvas Editor   : Fabric.js 6.x (dynamic import, ssr: false)
State Management: Zustand
Real-time       : Supabase Realtime (Presence + Broadcast)
Image Processing: Browser-side - Sharp(wasm) / Canvas API
Mobile          : 반응형 + PWA (모바일 최적화 필수)
```

### 2.2 Backend
```
Runtime         : Next.js API Routes (Edge/Node)
Database        : Supabase (PostgreSQL)
Auth            : Supabase Auth (Magic Link + OAuth)
Storage         : Supabase Storage (S3 compatible)
Real-time       : Supabase Realtime Channels
PDF Generation  : Server-side - Puppeteer / ReportLab
Image Processing: Sharp (Node.js)
Queue           : Supabase Edge Functions + pg_cron
```

### 2.3 Infrastructure
```
Hosting         : Vercel (Frontend) + Supabase (Backend)
CDN             : Vercel Edge Network + Supabase CDN
Media Storage   : Supabase Storage (원본) + Image Transform (썸네일)
Monitoring      : Vercel Analytics + Sentry
```

---

## 3. 데이터베이스 스키마

### 3.1 ERD 개요

```
[users] 1──N [room_members] N──1 [rooms]
                                    │
                                    1
                                    │
                                    N
                               [messages]
                                    │
                                    1
                                    │
                                    N
                               [photos]
                                    │
                                    N
                                    │
                                    N
                            [photo_comments]
                                    
[rooms] 1──N [photobook_orders]
                    │
                    1
                    │
                    N
             [photobook_pages]

[rooms] 1──N [print_orders] 1──N [print_order_items]

[admin] ──── [editor_resources] (fonts, cliparts, backgrounds)
```

### 3.2 주요 테이블

```sql
-- 공유방
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  share_code VARCHAR(8) UNIQUE NOT NULL,
  share_link TEXT GENERATED ALWAYS AS (
    'https://sharesnap.app/join/' || share_code
  ) STORED,
  event_start_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 멤버
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  nickname TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 메시지 (채팅)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'photo', 'system'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 사진
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  uploaded_by UUID REFERENCES auth.users(id),
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  mime_type VARCHAR(50),
  exif_data JSONB DEFAULT '{}',
  taken_at TIMESTAMPTZ,
  caption TEXT,
  is_selected_for_book BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 사진 코멘트
CREATE TABLE photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 포토북 주문
CREATE TABLE photobook_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES auth.users(id),
  book_size VARCHAR(20) NOT NULL, -- 'A4', 'A5', '210x210'
  page_count INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
    -- draft → editing → confirmed → generating_pdf → pdf_ready → ordered → paid → printing → shipped → delivered
  cover_data JSONB DEFAULT '{}',      -- Fabric.js JSON (앞표지)
  back_cover_data JSONB DEFAULT '{}', -- Fabric.js JSON (뒷표지)
  pdf_url TEXT,
  total_price DECIMAL(10,2),
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 포토북 내지 페이지
CREATE TABLE photobook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES photobook_orders(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  photo_id UUID REFERENCES photos(id),
  comment_text TEXT,
  layout_data JSONB DEFAULT '{}', -- Fabric.js JSON
  is_customized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, page_number)
);

-- 사진 인화 주문
CREATE TABLE print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(30) DEFAULT 'pending',
  total_price DECIMAL(10,2),
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인화 주문 항목
CREATE TABLE print_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES print_orders(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id),
  print_size VARCHAR(20) NOT NULL, -- '4x6', '5x7', '8x10', 'A4'
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2)
);

-- 편집 리소스 (관리자)
CREATE TABLE editor_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL, -- 'font', 'clipart', 'background', 'template'
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. 모듈 아키텍처 (기능별 모듈화)

### 4.1 모듈 구조도

```
src/
├── modules/
│   ├── auth/                    # M1: 인증 모듈
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── room/                    # M2: 공유방 모듈
│   │   ├── components/
│   │   │   ├── RoomCreate.tsx
│   │   │   ├── RoomList.tsx
│   │   │   ├── RoomHeader.tsx
│   │   │   └── InviteLink.tsx
│   │   ├── hooks/
│   │   │   ├── useRoom.ts
│   │   │   └── useRoomMembers.ts
│   │   ├── services/
│   │   │   └── roomService.ts
│   │   └── types.ts
│   │
│   ├── chat/                    # M3: 채팅 모듈
│   │   ├── components/
│   │   │   ├── ChatRoom.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── PhotoMessage.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   └── useRealtime.ts
│   │   ├── services/
│   │   │   └── chatService.ts
│   │   └── types.ts
│   │
│   ├── photo/                   # M4: 사진 관리 모듈
│   │   ├── components/
│   │   │   ├── PhotoUploader.tsx
│   │   │   ├── PhotoGallery.tsx
│   │   │   ├── PhotoViewer.tsx
│   │   │   ├── PhotoSelector.tsx
│   │   │   └── PhotoGrid.tsx
│   │   ├── hooks/
│   │   │   ├── usePhotoUpload.ts
│   │   │   ├── usePhotoGallery.ts
│   │   │   └── useImageProcess.ts
│   │   ├── services/
│   │   │   ├── photoService.ts
│   │   │   ├── uploadService.ts
│   │   │   └── imageProcessor.ts
│   │   └── types.ts
│   │
│   ├── editor/                  # M5: Fabric.js 편집기 모듈 ⭐핵심
│   │   ├── components/
│   │   │   ├── FabricCanvas.tsx      # 공통 캔버스 래퍼
│   │   │   ├── CoverEditor.tsx       # 표지 편집기
│   │   │   ├── PageEditor.tsx        # 내지 편집기
│   │   │   ├── toolbar/
│   │   │   │   ├── TextTool.tsx
│   │   │   │   ├── ImageTool.tsx
│   │   │   │   ├── ShapeTool.tsx
│   │   │   │   ├── BackgroundTool.tsx
│   │   │   │   ├── FontPicker.tsx
│   │   │   │   ├── ColorPicker.tsx
│   │   │   │   └── ClipartPicker.tsx
│   │   │   ├── panels/
│   │   │   │   ├── LayerPanel.tsx
│   │   │   │   ├── PropertyPanel.tsx
│   │   │   │   └── ResourcePanel.tsx
│   │   │   └── mobile/
│   │   │       ├── MobileToolbar.tsx
│   │   │       └── MobileGestures.tsx
│   │   ├── hooks/
│   │   │   ├── useFabricCanvas.ts
│   │   │   ├── useCanvasHistory.ts   # Undo/Redo
│   │   │   ├── useCanvasExport.ts    # JSON/Image 내보내기
│   │   │   └── useEditorResources.ts
│   │   ├── services/
│   │   │   ├── fabricService.ts
│   │   │   ├── templateService.ts
│   │   │   └── resourceService.ts
│   │   ├── utils/
│   │   │   ├── canvasHelpers.ts
│   │   │   ├── dpiConverter.ts       # px ↔ mm ↔ 300dpi 변환
│   │   │   └── fontLoader.ts
│   │   └── types.ts
│   │
│   ├── photobook/               # M6: 포토북 모듈
│   │   ├── components/
│   │   │   ├── BookCreator.tsx        # 포토북 생성 위저드
│   │   │   ├── PhotoSelector.tsx      # 사진 선택 UI
│   │   │   ├── BookPreview.tsx        # 전체 미리보기
│   │   │   ├── PagePreview.tsx        # 페이지별 미리보기
│   │   │   ├── SizeSelector.tsx       # A4/A5/210x210 선택
│   │   │   └── BookConfirm.tsx        # 최종 확인
│   │   ├── hooks/
│   │   │   ├── usePhotobook.ts
│   │   │   ├── useAutoLayout.ts       # 자동 편집 로직
│   │   │   └── useBookPreview.ts
│   │   ├── services/
│   │   │   ├── photobookService.ts
│   │   │   ├── autoLayoutEngine.ts    # 자동 레이아웃 엔진
│   │   │   └── pdfGenerator.ts        # PDF 생성 요청
│   │   └── types.ts
│   │
│   ├── print-order/             # M7: 인화 주문 모듈
│   │   ├── components/
│   │   │   ├── PrintOrderForm.tsx
│   │   │   ├── SizeSelector.tsx
│   │   │   └── OrderSummary.tsx
│   │   ├── hooks/
│   │   │   └── usePrintOrder.ts
│   │   ├── services/
│   │   │   └── printOrderService.ts
│   │   └── types.ts
│   │
│   ├── pdf/                     # M8: PDF 생성 모듈 (서버사이드)
│   │   ├── generators/
│   │   │   ├── photobookPdf.ts        # 포토북 PDF 생성
│   │   │   ├── coverRenderer.ts       # 표지 렌더링
│   │   │   ├── pageRenderer.ts        # 내지 렌더링
│   │   │   └── pdfMerger.ts           # 페이지 병합
│   │   ├── utils/
│   │   │   ├── dpiUtils.ts
│   │   │   ├── colorProfile.ts        # ICC 색상 프로파일
│   │   │   └── fontEmbed.ts           # 폰트 임베드
│   │   └── types.ts
│   │
│   ├── admin/                   # M9: 관리자 모듈
│   │   ├── components/
│   │   │   ├── ResourceManager.tsx     # 리소스 관리
│   │   │   ├── FontUploader.tsx
│   │   │   ├── ClipartManager.tsx
│   │   │   ├── BackgroundManager.tsx
│   │   │   ├── OrderDashboard.tsx
│   │   │   └── TemplateEditor.tsx
│   │   ├── services/
│   │   │   └── adminService.ts
│   │   └── types.ts
│   │
│   └── shared/                  # M0: 공유 모듈
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Navigation.tsx
│       │   ├── LoadingSpinner.tsx
│       │   ├── ImageOptimizer.tsx
│       │   └── ErrorBoundary.tsx
│       ├── hooks/
│       │   ├── useSupabase.ts
│       │   ├── useAuth.ts
│       │   └── useToast.ts
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── constants.ts
│       │   └── utils.ts
│       └── types/
│           └── global.ts
```

### 4.2 모듈 의존성 매트릭스

```
        M0   M1   M2   M3   M4   M5   M6   M7   M8   M9
M0 공유  -    -    -    -    -    -    -    -    -    -
M1 인증  ✓    -    -    -    -    -    -    -    -    -
M2 방    ✓    ✓    -    -    -    -    -    -    -    -
M3 채팅  ✓    ✓    ✓    -    -    -    -    -    -    -
M4 사진  ✓    ✓    ✓    ✓    -    -    -    -    -    -
M5 편집  ✓    -    -    -    ✓    -    -    -    -    -
M6 포토북 ✓   ✓    ✓    -    ✓    ✓    -    -    ✓    -
M7 인화  ✓    ✓    ✓    -    ✓    -    -    -    -    -
M8 PDF   ✓    -    -    -    -    -    -    -    -    -
M9 관리  ✓    ✓    -    -    -    -    -    -    -    -

✓ = 의존함
```

### 4.3 재활용성 설계

```typescript
// ===== 재활용 가능한 핵심 컴포넌트/Hook =====

// 1. FabricCanvas - 표지/내지/독립 에디터 모두 공용
interface FabricCanvasProps {
  width: number;         // mm 단위
  height: number;        // mm 단위
  dpi: number;           // 300
  initialData?: string;  // Fabric.js JSON
  onSave?: (json: string, preview: string) => void;
  mode: 'cover' | 'page' | 'freeform';
  resources?: EditorResources;
}

// 2. useImageProcess - 사진 업로드/리사이즈/최적화 공용
interface UseImageProcess {
  resize(file: File, maxWidth: number, quality: number): Promise<Blob>;
  generateThumbnail(file: File): Promise<string>;
  getExifData(file: File): Promise<ExifData>;
  convertToBase64(file: File): Promise<string>;
  ensureDpi(image: HTMLImageElement, targetDpi: number): Promise<Blob>;
}

// 3. DPI 변환 유틸 - PDF/편집기/미리보기 공용
const DPI_UTILS = {
  mmToPixels: (mm: number, dpi: number) => Math.round(mm * dpi / 25.4),
  pixelsToMm: (px: number, dpi: number) => Math.round(px * 25.4 / dpi * 100) / 100,
  BOOK_SIZES: {
    'A4':      { width: 210, height: 297 },
    'A5':      { width: 148, height: 210 },
    '210x210': { width: 210, height: 210 },
  } as const,
  getPixelSize: (size: BookSize, dpi: number = 300) => ({
    width: Math.round(BOOK_SIZES[size].width * dpi / 25.4),
    height: Math.round(BOOK_SIZES[size].height * dpi / 25.4),
  }),
};

// 4. 자동 레이아웃 엔진 - 포토북/인화 미리보기 공용
interface AutoLayoutEngine {
  generatePageLayout(
    photo: Photo,
    comment: string,
    bookSize: BookSize,
    template?: LayoutTemplate
  ): FabricJSON;
}
```

---

## 5. 책 사이즈 & PDF 스펙

### 5.1 사이즈 상세

| 사이즈 | mm | 300dpi 픽셀 | 용도 |
|--------|-----|-------------|------|
| A4 | 210 × 297 | 2480 × 3508 | 대형 포토북 |
| A5 | 148 × 210 | 1748 × 2480 | 일반 포토북 |
| 210×210 | 210 × 210 | 2480 × 2480 | 정사각 포토북 |

### 5.2 PDF 생성 요건

```
해상도      : 300dpi (인쇄 품질)
색상모드    : CMYK (인쇄용) / sRGB (화면 미리보기)
블리드      : 3mm (각 면)
안전영역    : 내부 5mm
폰트        : 모든 폰트 임베드 (서브셋)
이미지압축  : JPEG Quality 95% (인쇄용)
PDF버전     : PDF/X-4 (인쇄 호환)
```

### 5.3 페이지 구성

```
[앞표지] - [내지 1] - [내지 2] - ... - [내지 N] - [뒷표지]

내지 기본 레이아웃 (1페이지 1사진):
┌─────────────────────────────────┐
│          (여백 15mm)             │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │       사진 영역            │  │
│  │   (페이지의 60~70% 차지)   │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  코멘트 텍스트 영역        │  │
│  │  (페이지의 15~20% 차지)    │  │
│  └───────────────────────────┘  │
│                                 │
│              페이지 번호         │
└─────────────────────────────────┘
```

---

## 6. API 엔드포인트 설계

### 6.1 Room API
```
POST   /api/rooms                    # 공유방 생성
GET    /api/rooms                    # 내 공유방 목록
GET    /api/rooms/:id                # 공유방 상세
PUT    /api/rooms/:id                # 공유방 수정
DELETE /api/rooms/:id                # 공유방 삭제
POST   /api/rooms/join/:shareCode    # 공유방 참여
GET    /api/rooms/:id/members        # 멤버 목록
```

### 6.2 Chat/Message API
```
GET    /api/rooms/:id/messages       # 메시지 목록 (페이지네이션)
POST   /api/rooms/:id/messages       # 메시지 전송
DELETE /api/rooms/:id/messages/:mid  # 메시지 삭제
```

### 6.3 Photo API
```
POST   /api/rooms/:id/photos         # 사진 업로드 (다중)
GET    /api/rooms/:id/photos         # 사진 목록
GET    /api/rooms/:id/photos/:pid    # 사진 상세 + 코멘트
DELETE /api/rooms/:id/photos/:pid    # 사진 삭제
POST   /api/photos/:pid/comments     # 코멘트 작성
PUT    /api/photos/:pid/select       # 포토북 선택 토글
```

### 6.4 Photobook API
```
POST   /api/photobook/create         # 포토북 생성 (자동 편집)
GET    /api/photobook/:id            # 포토북 상세
PUT    /api/photobook/:id/cover      # 표지 저장 (Fabric.js JSON)
PUT    /api/photobook/:id/pages/:pn  # 내지 저장 (Fabric.js JSON)
POST   /api/photobook/:id/confirm    # 최종 확인
POST   /api/photobook/:id/generate   # PDF 생성 요청
GET    /api/photobook/:id/pdf        # PDF 다운로드
POST   /api/photobook/:id/order      # 포토북 주문
```

### 6.5 Print Order API
```
POST   /api/print-orders             # 인화 주문 생성
GET    /api/print-orders             # 내 주문 목록
GET    /api/print-orders/:id         # 주문 상세
```

### 6.6 Admin API
```
GET    /api/admin/resources           # 리소스 목록
POST   /api/admin/resources           # 리소스 등록
PUT    /api/admin/resources/:id       # 리소스 수정
DELETE /api/admin/resources/:id       # 리소스 삭제
POST   /api/admin/resources/upload    # 리소스 파일 업로드
GET    /api/admin/orders              # 전체 주문 관리
```

---

## 7. 서브에이전트 정의 & 오케스트레이션

### 7.1 에이전트 구성

```
┌─────────────────────────────────────────────────────────┐
│                  🎯 Orchestrator Agent                   │
│              (총괄 지휘 / 파이프라인 관리)                 │
└────────┬──────┬──────┬──────┬──────┬──────┬─────────────┘
         │      │      │      │      │      │
    ┌────┴┐ ┌──┴──┐ ┌─┴──┐ ┌┴───┐ ┌┴──┐ ┌─┴───┐
    │ A1  │ │ A2  │ │ A3 │ │ A4 │ │A5 │ │ A6  │
    │기획 │ │개발 │ │디자│ │운영│ │QC │ │테스터│
    │에이 │ │에이 │ │인  │ │에이│ │에이│ │에이 │
    │전트 │ │전트 │ │에이│ │전트│ │전트│ │전트 │
    │     │ │     │ │전트│ │    │ │   │ │     │
    └─────┘ └─────┘ └────┘ └────┘ └───┘ └─────┘
```

### 7.2 에이전트별 역할 & 책임

#### A1: Planning Agent (기획 에이전트)
```yaml
역할: 프로젝트 기획 및 태스크 분해
책임:
  - 사용자 요구사항 → 기능 목록 분해
  - 각 Phase별 개발 태스크 정의
  - 모듈간 의존성 분석 및 개발 순서 결정
  - 각 에이전트에 전달할 태스크 스펙 작성
  - 우선순위 및 일정 관리
입력: 프로젝트 요구사항, 기술 스택
출력: 태스크 목록, 의존성 그래프, Phase 정의
```

#### A2: Development Agent (개발 에이전트)
```yaml
역할: 코드 구현
책임:
  - 모듈별 코드 구현 (TypeScript/React/Next.js)
  - API 엔드포인트 구현
  - Supabase 스키마 및 RLS 정책 작성
  - Fabric.js 편집기 컴포넌트 구현
  - PDF 생성 모듈 구현
  - 실시간 기능 구현 (Realtime)
입력: 태스크 스펙, 기술 스택, 모듈 아키텍처
출력: 소스 코드, 마이그레이션 파일
도구: CLAUDE.md 참조, 코드 생성, 파일 CRUD
```

#### A3: Design Agent (디자인 에이전트)
```yaml
역할: UI/UX 디자인 및 스타일링
책임:
  - 컴포넌트 스타일링 (Tailwind CSS)
  - 모바일 최적화 반응형 디자인
  - 편집기 UI/UX (모바일 터치 최적화)
  - 디자인 토큰 및 테마 시스템 정의
  - 편집기 툴바 레이아웃 (모바일/데스크톱)
  - 사진 갤러리/뷰어 UI
입력: 와이어프레임, 컴포넌트 목록
출력: 스타일 코드, 디자인 토큰, 반응형 레이아웃
```

#### A4: Operations Agent (운영 에이전트)
```yaml
역할: 인프라 및 배포
책임:
  - Supabase 프로젝트 설정
  - Storage 버킷 및 정책 설정
  - Vercel 배포 설정
  - 환경변수 관리
  - 이미지 변환 파이프라인 설정
  - CDN 및 캐싱 전략
입력: 기술 스택, 배포 요건
출력: 인프라 설정 파일, 배포 스크립트
```

#### A5: QC Agent (품질 관리 에이전트)
```yaml
역할: 코드 리뷰 및 품질 검증
책임:
  - 코드 리뷰 (일관성, 패턴 준수)
  - TypeScript 타입 안전성 검증
  - 모듈간 인터페이스 호환성 확인
  - 성능 병목 분석 (이미지 처리, PDF 생성)
  - 보안 리뷰 (RLS, 파일 업로드 검증)
  - Fabric.js SSR 충돌 방지 확인
입력: 소스 코드, 아키텍처 문서
출력: 리뷰 리포트, 개선 권고
```

#### A6: Tester Agent (테스터 에이전트)
```yaml
역할: 테스트 작성 및 실행
책임:
  - 단위 테스트 작성 (Jest/Vitest)
  - 통합 테스트 작성
  - E2E 테스트 시나리오 (Playwright)
  - 이미지 업로드 → 갤러리 → 포토북 → PDF 풀 플로우
  - 모바일 편집기 터치 인터랙션 테스트
  - PDF 출력물 300dpi 품질 검증
입력: 기능 명세, 소스 코드
출력: 테스트 코드, 테스트 결과 리포트
```

### 7.3 오케스트레이션 파이프라인

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTO PIPELINE FLOW                         │
│                                                              │
│  Phase 1 (Foundation)                                        │
│  ┌─────┐    ┌─────┐    ┌─────┐                              │
│  │ A1  │───▶│ A2  │───▶│ A5  │                              │
│  │기획 │    │M0+M1│    │리뷰 │                              │
│  │분해 │    │구현 │    │검증 │                              │
│  └─────┘    └─────┘    └──┬──┘                              │
│                           │ Pass                             │
│  Phase 2 (Core)          ▼                                  │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                  │
│  │ A2  │───▶│ A3  │───▶│ A5  │───▶│ A6  │                  │
│  │M2+M3│    │스타일│    │리뷰 │    │테스트│                  │
│  │구현 │    │적용  │    │검증 │    │작성  │                  │
│  └─────┘    └─────┘    └─────┘    └──┬──┘                  │
│                                      │ Pass                 │
│  Phase 3 (Photo)                    ▼                      │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                  │
│  │ A2  │───▶│ A3  │───▶│ A5  │───▶│ A6  │                  │
│  │ M4  │    │갤러리│    │리뷰 │    │테스트│                  │
│  │구현 │    │UI   │    │검증 │    │작성  │                  │
│  └─────┘    └─────┘    └─────┘    └──┬──┘                  │
│                                      │ Pass                 │
│  Phase 4 (Editor) ⭐ 핵심           ▼                      │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                  │
│  │ A2  │───▶│ A3  │───▶│ A5  │───▶│ A6  │                  │
│  │ M5  │    │편집기│    │SSR  │    │터치  │                  │
│  │구현 │    │UX   │    │검증 │    │테스트│                  │
│  └─────┘    └─────┘    └─────┘    └──┬──┘                  │
│                                      │ Pass                 │
│  Phase 5 (Photobook + PDF)          ▼                      │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                  │
│  │ A2  │───▶│ A2  │───▶│ A5  │───▶│ A6  │                  │
│  │ M6  │    │ M8  │    │DPI  │    │PDF  │                  │
│  │구현 │    │PDF  │    │검증 │    │테스트│                  │
│  └─────┘    └─────┘    └─────┘    └──┬──┘                  │
│                                      │ Pass                 │
│  Phase 6 (Order + Admin)            ▼                      │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐      │
│  │ A2  │───▶│ A2  │───▶│ A3  │───▶│ A5  │───▶│ A4  │      │
│  │ M7  │    │ M9  │    │전체 │    │최종 │    │배포  │      │
│  │인화 │    │관리 │    │UI  │    │QC  │    │설정  │      │
│  └─────┘    └─────┘    └─────┘    └─────┘    └─────┘      │
│                                                              │
│  Phase 7 (Integration & Deploy)                              │
│  ┌─────┐    ┌─────┐    ┌─────┐                              │
│  │ A6  │───▶│ A4  │───▶│ A5  │                              │
│  │E2E  │    │배포 │    │최종 │                              │
│  │테스트│    │실행 │    │검증 │                              │
│  └─────┘    └─────┘    └─────┘                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Phase별 상세 개발 계획

### Phase 1: Foundation (기반) — 2~3일
```
목표: 프로젝트 셋업, 인증, 공유 인프라

태스크:
├── T1.1 Next.js 14 프로젝트 초기화 (App Router, TypeScript)
├── T1.2 Supabase 프로젝트 생성 및 연결
├── T1.3 Tailwind CSS + shadcn/ui 설정
├── T1.4 공용 모듈(M0) 구현
│   ├── Supabase 클라이언트 설정
│   ├── Layout 컴포넌트
│   ├── ErrorBoundary
│   └── 공용 타입 정의
├── T1.5 인증 모듈(M1) 구현
│   ├── Magic Link 로그인
│   ├── 소셜 로그인 (카카오, 구글)
│   └── AuthGuard 미들웨어
└── T1.6 DB 마이그레이션 (전체 스키마)

산출물: 로그인 가능한 빈 앱, DB 스키마 완료
```

### Phase 2: Core - Room & Chat (핵심) — 3~4일
```
목표: 공유방 생성/참여, 실시간 채팅

태스크:
├── T2.1 공유방 모듈(M2) 구현
│   ├── 방 생성 (이름, 설명, 기간 설정)
│   ├── 초대 링크 생성 (고유 shareCode)
│   ├── 방 참여 (링크 클릭 → 닉네임 입력 → 입장)
│   ├── 멤버 관리
│   └── 방 목록 / 상세
├── T2.2 채팅 모듈(M3) 구현
│   ├── Supabase Realtime Channel 설정
│   ├── 텍스트 메시지 송수신
│   ├── 온라인 상태 표시 (Presence)
│   ├── 메시지 무한 스크롤
│   └── 시스템 메시지 (입장/퇴장)
└── T2.3 RLS 정책 설정 (방 멤버만 접근)

산출물: 실시간 채팅 가능한 공유방
```

### Phase 3: Photo Management (사진 관리) — 3~4일
```
목표: 사진 업로드, 갤러리, 코멘트

태스크:
├── T3.1 사진 모듈(M4) 구현
│   ├── 다중 사진 업로드 (드래그&드롭 + 모바일 카메라)
│   ├── 이미지 처리 파이프라인
│   │   ├── 원본 저장 (Supabase Storage)
│   │   ├── 썸네일 자동 생성 (400px)
│   │   ├── 중간 사이즈 생성 (1200px)
│   │   ├── EXIF 추출 (촬영일시, GPS)
│   │   └── 방향 자동 보정
│   ├── 갤러리 뷰
│   │   ├── 그리드 뷰 (3/4열)
│   │   ├── 타임라인 뷰 (날짜별 그룹)
│   │   └── 전체화면 뷰어 (스와이프)
│   ├── 사진에 코멘트 작성
│   └── 사진 선택 (포토북/인화용)
├── T3.2 채팅에서 사진 메시지 전송
│   └── 사진 업로드 → 메시지 자동 생성
└── T3.3 Storage 버킷 정책 설정

산출물: 사진 공유 + 갤러리 기능 완성
```

### Phase 4: Fabric.js Editor (편집기) ⭐ — 5~7일
```
목표: 표지/내지 Fabric.js 기반 편집기

태스크:
├── T4.1 Fabric.js 기본 설정
│   ├── dynamic import (ssr: false) ← 필수
│   ├── 캔버스 초기화 (사이즈별 300dpi 해상도)
│   └── 캔버스 래퍼 컴포넌트 (FabricCanvas)
├── T4.2 편집 도구 구현
│   ├── 텍스트 추가/편집
│   │   ├── 폰트 선택 (서버 제공 폰트 로드)
│   │   ├── 크기/색상/정렬
│   │   └── 곡선 텍스트 (옵션)
│   ├── 이미지 배치
│   │   ├── 사진 추가/교체
│   │   ├── 크롭/리사이즈
│   │   └── 필터 (밝기/대비/흑백)
│   ├── 도형 추가
│   ├── 클립아트 삽입 (서버 제공)
│   ├── 배경 설정
│   │   ├── 단색 배경
│   │   ├── 그라데이션
│   │   └── 배경 이미지 (서버 제공)
│   └── 레이어 관리 (앞/뒤 순서)
├── T4.3 모바일 최적화
│   ├── 핀치 줌/팬
│   ├── 터치 오브젝트 선택/이동
│   ├── 하단 도구 모음 (모바일)
│   ├── 사이드 패널 → 바텀 시트 전환
│   └── 제스처 기반 Undo/Redo
├── T4.4 히스토리 (Undo/Redo)
├── T4.5 저장/불러오기
│   ├── Fabric.js JSON ↔ DB 연동
│   └── 자동 저장 (debounce)
└── T4.6 편집 리소스 로드
    ├── 폰트 목록 API 연동 + @font-face 동적 로드
    ├── 클립아트 목록 API 연동
    └── 배경 이미지 목록 API 연동

산출물: 모바일 최적화된 Fabric.js 편집기
```

### Phase 5: Photobook + PDF (포토북) — 5~7일
```
목표: 자동 편집, 미리보기, PDF 생성

태스크:
├── T5.1 포토북 생성 위저드
│   ├── 사이즈 선택 (A4/A5/210x210)
│   ├── 사진 선택 (순서 드래그)
│   └── 사진+코멘트 매칭 확인
├── T5.2 자동 레이아웃 엔진
│   ├── 1페이지 1사진 레이아웃 생성
│   ├── 사진 비율에 따른 배치 최적화
│   ├── 코멘트 텍스트 자동 배치
│   ├── Fabric.js JSON 자동 생성
│   └── 기본 템플릿 적용
├── T5.3 표지 편집
│   ├── 앞표지 기본 템플릿 → 편집기(M5) 연결
│   └── 뒷표지 기본 템플릿 → 편집기(M5) 연결
├── T5.4 내지 커스텀
│   ├── 자동 편집 결과 미리보기
│   ├── 개별 페이지 편집기(M5) 연결
│   └── 페이지 순서 변경
├── T5.5 전체 미리보기
│   ├── 플립북 스타일 미리보기
│   └── 썸네일 목록 미리보기
├── T5.6 PDF 생성 (서버사이드) — M8
│   ├── Fabric.js JSON → 서버 렌더링
│   ├── 300dpi 고해상도 이미지 배치
│   ├── 폰트 임베드
│   ├── 페이지별 PDF 생성
│   ├── 전체 PDF 병합
│   ├── 블리드/안전영역 처리
│   └── PDF 다운로드 URL 생성
└── T5.7 최종 확인 → PDF 생성 → 주문 연결

산출물: 포토북 자동편집 + 커스텀 + PDF 생성
```

### Phase 6: Orders & Admin (주문/관리) — 3~4일
```
목표: 인화 주문, 포토북 주문, 관리자 페이지

태스크:
├── T6.1 인화 주문 모듈(M7)
│   ├── 사진 선택 → 사이즈 선택
│   ├── 수량/가격 계산
│   ├── 배송지 입력
│   └── 주문 확인/결제 연동 준비
├── T6.2 포토북 주문 프로세스
│   ├── PDF 생성 완료 → 주문 페이지
│   ├── 가격 계산 (사이즈 × 페이지수)
│   ├── 배송지 입력
│   └── 주문 확인
├── T6.3 관리자 모듈(M9)
│   ├── 편집 리소스 관리 (CRUD)
│   │   ├── 폰트 업로드/관리
│   │   ├── 클립아트 업로드/관리
│   │   └── 배경이미지 업로드/관리
│   ├── 주문 대시보드
│   └── 사용자/방 관리
└── T6.4 관리자 인증 (role-based)

산출물: 전체 서비스 기능 완성
```

### Phase 7: Integration & Deploy (통합/배포) — 2~3일
```
목표: 전체 통합 테스트, 배포

태스크:
├── T7.1 E2E 테스트
│   ├── 회원가입 → 방 생성 → 초대
│   ├── 사진 업로드 → 채팅 → 갤러리
│   ├── 포토북 생성 → 편집 → PDF → 주문
│   └── 인화 주문 풀 플로우
├── T7.2 성능 최적화
│   ├── 이미지 lazy loading
│   ├── PDF 생성 큐 최적화
│   └── 모바일 성능 프로파일링
├── T7.3 Vercel 배포
├── T7.4 도메인/SSL 설정
└── T7.5 모니터링 설정

산출물: 프로덕션 배포 완료
```

---

## 9. CLAUDE.md (Claude Code 지시 파일)

```markdown
# ShareSnap - Claude Code Instructions

## 프로젝트 개요
사진 공유 + 포토북 자동편집 서비스
- Tech: Next.js 14 (App Router) + TypeScript + Supabase + Fabric.js 6
- Style: Tailwind CSS + shadcn/ui
- Deploy: Vercel + Supabase

## 핵심 규칙

### Fabric.js SSR 방지 (필수!)
```tsx
// 반드시 dynamic import + ssr: false
import dynamic from 'next/dynamic';
const FabricCanvas = dynamic(() => import('./FabricCanvas'), { ssr: false });
```

### 모듈 구조
- src/modules/{모듈명}/components/ - 컴포넌트
- src/modules/{모듈명}/hooks/ - 커스텀 훅
- src/modules/{모듈명}/services/ - 비즈니스 로직/API
- src/modules/{모듈명}/types.ts - 타입 정의

### DPI 변환 (공용)
- 항상 src/modules/editor/utils/dpiConverter.ts 사용
- 300dpi 기준: A4 = 2480×3508px, A5 = 1748×2480px, 210×210 = 2480×2480px

### Supabase
- RLS 항상 활성화
- Storage 버킷: photos(원본), thumbnails, resources(편집리소스), pdfs(생성결과)

### 코딩 컨벤션
- TypeScript strict mode
- 함수형 컴포넌트 + React Hooks
- 서비스 레이어에서 비즈니스 로직 분리
- 에러 핸들링 필수 (try-catch + toast)
- Korean 주석 사용

### 커밋 컨벤션
- feat(module): 기능 추가
- fix(module): 버그 수정
- refactor(module): 리팩토링
- style(module): 스타일 변경
- test(module): 테스트 추가

## 현재 Phase
Phase 1: Foundation

## 완료 현황
(빌드 진행에 따라 업데이트)
```

---

## 10. 핵심 기술 구현 가이드

### 10.1 Fabric.js 캔버스 래퍼 (핵심 재활용 컴포넌트)

```typescript
// src/modules/editor/components/FabricCanvas.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Canvas, FabricImage, Textbox } from 'fabric';
import { DPI_UTILS, BookSize } from '../utils/dpiConverter';

interface FabricCanvasProps {
  bookSize: BookSize;
  mode: 'cover' | 'page';
  initialData?: string;
  onSave?: (json: string, previewUrl: string) => void;
  onReady?: (canvas: Canvas) => void;
}

export default function FabricCanvas({
  bookSize, mode, initialData, onSave, onReady
}: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const pixelSize = DPI_UTILS.getPixelSize(bookSize);
    
    // 화면 표시용 스케일 (실제는 300dpi, 화면은 축소 표시)
    const displayScale = Math.min(
      window.innerWidth * 0.9 / pixelSize.width,
      window.innerHeight * 0.7 / pixelSize.height,
      1
    );

    const canvas = new Canvas(canvasRef.current, {
      width: pixelSize.width * displayScale,
      height: pixelSize.height * displayScale,
      backgroundColor: '#ffffff',
    });

    // 내부 해상도는 300dpi 유지
    canvas.setZoom(displayScale);
    canvas.setDimensions({
      width: pixelSize.width,
      height: pixelSize.height,
    }, { backstoreOnly: true });

    if (initialData) {
      canvas.loadFromJSON(JSON.parse(initialData));
    }

    fabricRef.current = canvas;
    onReady?.(canvas);

    return () => { canvas.dispose(); };
  }, [bookSize]);

  const handleSave = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    const preview = fabricRef.current.toDataURL({ format: 'jpeg', quality: 0.7 });
    onSave?.(json, preview);
  }, [onSave]);

  return <canvas ref={canvasRef} />;
}
```

### 10.2 자동 레이아웃 엔진

```typescript
// src/modules/photobook/services/autoLayoutEngine.ts
import { BookSize, DPI_UTILS } from '@/modules/editor/utils/dpiConverter';

interface AutoLayoutInput {
  photo: { url: string; width: number; height: number };
  comment: string;
  bookSize: BookSize;
  pageNumber: number;
}

export function generatePageLayout(input: AutoLayoutInput): object {
  const { photo, comment, bookSize, pageNumber } = input;
  const size = DPI_UTILS.getPixelSize(bookSize);
  
  const margin = DPI_UTILS.mmToPixels(15, 300);
  const contentWidth = size.width - margin * 2;
  const contentHeight = size.height - margin * 2;
  
  // 사진 영역: 페이지의 65%
  const photoAreaHeight = contentHeight * 0.65;
  // 코멘트 영역: 페이지의 20%
  const commentAreaHeight = contentHeight * 0.20;
  
  // 사진 비율에 맞게 크기 계산
  const photoRatio = photo.width / photo.height;
  let photoWidth, photoHeight;
  
  if (photoRatio > contentWidth / photoAreaHeight) {
    photoWidth = contentWidth;
    photoHeight = contentWidth / photoRatio;
  } else {
    photoHeight = photoAreaHeight;
    photoWidth = photoAreaHeight * photoRatio;
  }
  
  // Fabric.js JSON 포맷
  return {
    version: '6.0.0',
    objects: [
      // 사진
      {
        type: 'image',
        src: photo.url,
        left: margin + (contentWidth - photoWidth) / 2,
        top: margin,
        scaleX: photoWidth / photo.width,
        scaleY: photoHeight / photo.height,
      },
      // 코멘트
      {
        type: 'textbox',
        text: comment || '',
        left: margin,
        top: margin + photoAreaHeight + DPI_UTILS.mmToPixels(5, 300),
        width: contentWidth,
        fontSize: DPI_UTILS.mmToPixels(4, 300), // 4mm ≈ 약 11pt
        fontFamily: 'NanumMyeongjo',
        textAlign: 'center',
        fill: '#333333',
      },
      // 페이지 번호
      {
        type: 'textbox',
        text: String(pageNumber),
        left: size.width / 2 - DPI_UTILS.mmToPixels(5, 300),
        top: size.height - margin,
        width: DPI_UTILS.mmToPixels(10, 300),
        fontSize: DPI_UTILS.mmToPixels(3, 300),
        fontFamily: 'NanumGothic',
        textAlign: 'center',
        fill: '#999999',
      },
    ],
    background: '#ffffff',
  };
}
```

### 10.3 PDF 생성 (서버사이드)

```typescript
// src/modules/pdf/generators/photobookPdf.ts
// 서버사이드에서 Fabric.js JSON을 PDF로 변환

interface PdfGenerationJob {
  orderId: string;
  bookSize: BookSize;
  coverData: object;      // 앞표지 Fabric.js JSON
  backCoverData: object;  // 뒷표지 Fabric.js JSON
  pages: Array<{
    pageNumber: number;
    layoutData: object;    // 내지 Fabric.js JSON
  }>;
}

// 방법 1: Puppeteer (Fabric.js JSON → HTML 렌더링 → PDF)
// 방법 2: node-canvas + fabric (서버에서 직접 렌더링)
// 방법 3: ReportLab (Python) - JSON 파싱 후 직접 그리기

// 추천: Puppeteer 방식 (Fabric.js 렌더링 일관성 보장)
export async function generatePhotobookPdf(job: PdfGenerationJob) {
  // 1. 각 페이지를 Fabric.js로 렌더링하는 HTML 생성
  // 2. Puppeteer로 각 페이지를 300dpi PDF로 캡처
  // 3. pypdf로 전체 PDF 병합
  // 4. Supabase Storage에 업로드
  // 5. 주문 상태 업데이트
}
```

---

## 11. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Fabric.js SSR 충돌 | 빌드 실패 | dynamic import + ssr:false 철저 적용 |
| 대용량 이미지 업로드 | 서버 부하 | 클라이언트 사전 리사이즈 + chunk upload |
| PDF 생성 시간 | UX 저하 | 비동기 큐 + 진행률 표시 |
| 모바일 편집기 성능 | 터치 반응 느림 | 오브젝트 수 제한 + 캔버스 최적화 |
| 폰트 렌더링 차이 | 화면≠인쇄 | 서버 측 동일 폰트 임베드 |
| 300dpi 파일 용량 | 스토리지 비용 | 이미지 품질 최적화 + CDN 캐싱 |

---

## 12. 예상 일정

| Phase | 기간 | 누적 |
|-------|------|------|
| Phase 1: Foundation | 2~3일 | 3일 |
| Phase 2: Room & Chat | 3~4일 | 7일 |
| Phase 3: Photo | 3~4일 | 11일 |
| Phase 4: Editor ⭐ | 5~7일 | 18일 |
| Phase 5: Photobook + PDF | 5~7일 | 25일 |
| Phase 6: Orders & Admin | 3~4일 | 29일 |
| Phase 7: Integration | 2~3일 | 32일 |

**총 예상 기간: 약 4~5주 (MVP 기준)**

---

## 부록: 에이전트 파이프라인 실행 명령

### Orchestrator 실행 순서

```bash
# Phase 1
orchestrator run --phase=1 --agents="A1→A2→A5"
  A1: 태스크 분해 (T1.1~T1.6)
  A2: M0+M1 구현
  A5: 코드 리뷰
  → Pass → Phase 2

# Phase 2
orchestrator run --phase=2 --agents="A2→A3→A5→A6"
  A2: M2+M3 구현
  A3: 채팅 UI 스타일링
  A5: 코드 리뷰 + RLS 검증
  A6: 실시간 채팅 테스트
  → Pass → Phase 3

# ... (Phase 3~7 동일 패턴)

# 전체 자동 실행
orchestrator run --auto --all-phases \
  --on-fail="rollback-and-retry" \
  --on-pass="next-phase" \
  --report="./reports/"
```

---

*문서 버전: 1.0*
*작성일: 2026-04-13*
*프로젝트명: ShareSnap (사진 공유 & 포토북 서비스)*

---

## 부록 A. v2.0 개정 내역 (2026-05-16)

> Phase 1·2 완료 후 전략 검토를 거쳐 아래 3개 문서가 본 계획서를 보완·우선합니다.
> 본문과 충돌하는 경우 아래 문서가 우선합니다.

### A.1 신규 전략 문서
| 문서 | 역할 | 본문 대체 범위 |
|------|------|---------------|
| `docs/ux-flows.md` | 카카오톡 중심 참여·공유 퍼널 설계 (초대→미리보기→1탭 참여→재방문 루프) | 본문 7장 사용자 플로우 |
| `docs/design-system.md` | 디자인 토큰(OKLCH)/타이포(Pretendard)/모션/화면별 스펙 — 시각 결정의 단일 소스 | 본문 UI 관련 서술 전체 |
| `docs/mobile-deployment.md` | PWA → Android TWA(Play Store) → iOS Capacitor(App Store) 3채널 배포 전략 | 본문 2.1 Mobile 항목 |

### A.2 기술 스택 정정 (실제 채택 버전)
```
Framework  : Next.js 16 (App Router, Turbopack, proxy 컨벤션)  ← 계획서의 14에서 변경 (ADR-006)
React      : 19.x
Styling    : Tailwind CSS v4 (@theme CSS 기반 설정) + shadcn/ui (sonner)
Font       : Pretendard Variable (dynamic-subset CDN)
Theme      : next-themes (light/dark "시네마 모드")
```

### A.3 P0 결함 수정 (Phase 3에서 처리)
1. **RLS로 인한 초대 링크 불능**: rooms_select가 멤버만 허용 → 비멤버는 share_code 조회 불가.
   → `008_join_funnel.sql`의 security definer RPC 2종(get_room_preview / join_room_via_share_code)으로 해결
2. **OAuth next 유실**: 로그인 후 초대 맥락 소실 → redirectTo에 ?next= 보존 + 콜백 오픈 리다이렉트 검증

### A.4 Phase 구조 변경
- Phase 3 = "Photo + Design + 참여 퍼널" 확장판 (T3.0~T3.5) — ORCHESTRATION.md 참조
- Phase 7 = 모바일 패키징 포함 (Bubblewrap TWA, Capacitor remote URL, Sign in with Apple 의무)
- 웹푸시는 Phase 5~6 (push_subscriptions 마이그레이션 009+ 선행)

*문서 버전: 2.0*
