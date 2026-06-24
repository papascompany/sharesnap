// Supabase DB 타입 — 실제 마이그레이션 적용 후 `supabase gen types typescript`로 자동 생성 권장
// Phase 1에서는 수동으로 핵심 테이블 타입을 정의해 둠

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // 랜딩 CMS 등 사이트 콘텐츠(key→jsonb 싱글톤). 마이그레이션 011.
      site_content: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          share_code: string;
          owner_id: string;
          cover_url: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          share_code?: string;
          owner_id: string;
          cover_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          share_code?: string;
          owner_id?: string;
          cover_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          nickname: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          nickname?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          nickname?: string | null;
          joined_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          type: "text" | "photo" | "system";
          content: string | null;
          photo_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          type?: "text" | "photo" | "system";
          content?: string | null;
          photo_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          type?: "text" | "photo" | "system";
          content?: string | null;
          photo_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          medium_path: string | null;
          original_filename: string | null;
          width: number | null;
          height: number | null;
          file_size: number | null;
          taken_at: string | null;
          is_selected_for_book: boolean;
          print_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          medium_path?: string | null;
          original_filename?: string | null;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          taken_at?: string | null;
          is_selected_for_book?: boolean;
          print_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          storage_path?: string;
          thumbnail_path?: string | null;
          medium_path?: string | null;
          original_filename?: string | null;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          taken_at?: string | null;
          is_selected_for_book?: boolean;
          print_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      photo_comments: {
        Row: {
          id: string;
          photo_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          photo_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          photo_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      photobook_orders: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          book_size: "A4" | "A5" | "210x210";
          page_count: number;
          status:
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
          cover_data: Json | null;
          pdf_path: string | null;
          preview_path: string | null;
          total_price: number | null;
          quantity: number;
          order_no: number;
          storige_session_id: string | null;
          cover_file_id: string | null;
          content_file_id: string | null;
          synthesis_job_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          book_size: "A4" | "A5" | "210x210";
          page_count?: number;
          status?:
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
          cover_data?: Json | null;
          pdf_path?: string | null;
          preview_path?: string | null;
          total_price?: number | null;
          quantity?: number;
          order_no?: never; // generated always as identity — 직접 입력 불가
          storige_session_id?: string | null;
          cover_file_id?: string | null;
          content_file_id?: string | null;
          synthesis_job_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          book_size?: "A4" | "A5" | "210x210";
          page_count?: number;
          status?:
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
          cover_data?: Json | null;
          pdf_path?: string | null;
          preview_path?: string | null;
          total_price?: number | null;
          quantity?: number;
          order_no?: never; // generated always as identity — 직접 수정 불가
          storige_session_id?: string | null;
          cover_file_id?: string | null;
          content_file_id?: string | null;
          synthesis_job_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photobook_pages: {
        Row: {
          id: string;
          order_id: string;
          page_index: number;
          fabric_data: Json;
          preview_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          page_index: number;
          fabric_data?: Json;
          preview_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          page_index?: number;
          fabric_data?: Json;
          preview_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      print_orders: {
        Row: {
          id: string;
          user_id: string;
          room_id: string | null;
          status:
            | "draft"
            | "confirmed"
            | "paid"
            | "printing"
            | "shipped"
            | "delivered";
          total_price: number;
          shipping_address: Json;
          recipient_name: string;
          recipient_phone: string;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id?: string | null;
          status?:
            | "draft"
            | "confirmed"
            | "paid"
            | "printing"
            | "shipped"
            | "delivered";
          total_price: number;
          shipping_address: Json;
          recipient_name: string;
          recipient_phone: string;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          room_id?: string | null;
          status?:
            | "draft"
            | "confirmed"
            | "paid"
            | "printing"
            | "shipped"
            | "delivered";
          total_price?: number;
          shipping_address?: Json;
          recipient_name?: string;
          recipient_phone?: string;
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      print_order_items: {
        Row: {
          id: string;
          order_id: string;
          photo_id: string;
          paper_size: string;
          paper_type: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          photo_id: string;
          paper_size: string;
          paper_type: string;
          quantity?: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          photo_id?: string;
          paper_size?: string;
          paper_type?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [];
      };
      editor_resources: {
        Row: {
          id: string;
          category: "font" | "clipart" | "background" | "template";
          name: string;
          storage_path: string;
          preview_url: string | null;
          metadata: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: "font" | "clipart" | "background" | "template";
          name: string;
          storage_path: string;
          preview_url?: string | null;
          metadata?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: "font" | "clipart" | "background" | "template";
          name?: string;
          storage_path?: string;
          preview_url?: string | null;
          metadata?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // 009_storige_integration.sql — Supabase UUID ↔ Storige memberSeqno 매핑
      user_storige_map: {
        Row: {
          user_id: string;
          member_no: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          member_no?: never; // generated always as identity — 직접 입력 불가
          created_at?: string;
        };
        Update: {
          user_id?: string;
          member_no?: never; // generated always as identity — 직접 수정 불가
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      // 008_join_funnel.sql — 비로그인 방 미리보기 (room id 미노출)
      get_room_preview: {
        Args: { p_share_code: string };
        Returns: {
          name: string;
          description: string | null;
          cover_url: string | null;
          member_count: number;
          photo_count: number;
          created_at: string;
        }[];
      };
      // 008_join_funnel.sql — share_code 기반 멱등 참여 (room id 반환)
      join_room_via_share_code: {
        Args: { p_share_code: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
