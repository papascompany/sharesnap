// 전체 프로젝트에서 공통으로 사용하는 도메인 타입

export type BookSize = "A4" | "A5" | "210x210";

export type RoomRole = "owner" | "admin" | "member";

export type PhotobookStatus =
  | "draft"
  | "editing"
  | "confirmed"
  | "generating_pdf"
  | "pdf_ready"
  | "ordered"
  | "paid"
  | "printing"
  | "shipped"
  | "delivered";

export type PrintOrderStatus =
  | "draft"
  | "confirmed"
  | "paid"
  | "printing"
  | "shipped"
  | "delivered";

export type MessageType = "text" | "photo" | "system";

export type ResourceCategory = "font" | "clipart" | "background" | "template";

export interface ShippingAddress {
  zipcode: string;
  address: string;
  addressDetail: string;
}

export interface AppUser {
  id: string;
  email: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  provider: string | null;
}
