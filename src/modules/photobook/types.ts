// 포토북 도메인 타입 — Storige 임베드 연동 (HANDOFF §3.4, 마이그레이션 009)

import type { Database } from "@/modules/shared/types/database";
import type { BookSize, PhotobookStatus } from "@/modules/shared/types/global";

export type { BookSize, PhotobookStatus };

// photobook_orders 테이블 Row
export type PhotobookOrderRow =
  Database["public"]["Tables"]["photobook_orders"]["Row"];

/**
 * 마이그레이션 009 신규 컬럼 보강 타입.
 * database.ts(에이전트 A 소유) 갱신 전후 모두 타입 안전하게 접근하기 위해
 * 옵셔널 교차 타입으로 사용한다 — Row가 갱신되면 자연스럽게 좁혀진다.
 */
export interface PhotobookOrderStorigeColumns {
  /** Storige orderSeqno로 쓰는 정수 주문번호 (generated identity) */
  order_no?: number | null;
  /** 재편집 키 — /embed?sessionId= 진입에 사용 */
  storige_session_id?: string | null;
  cover_file_id?: string | null;
  content_file_id?: string | null;
  synthesis_job_id?: string | null;
}

// 클라이언트 도메인 모델 (camelCase)
export interface PhotobookOrder {
  id: string;
  roomId: string;
  userId: string;
  bookSize: BookSize;
  pageCount: number;
  status: PhotobookStatus;
  /** Storige orderSeqno (마이그레이션 009 미적용 환경에서는 null) */
  orderNo: number | null;
  /** Storige 재편집 키 */
  storigeSessionId: string | null;
  coverFileId: string | null;
  contentFileId: string | null;
  createdAt: string;
  updatedAt: string;
}
