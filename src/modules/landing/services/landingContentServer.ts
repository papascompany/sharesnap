// ⚠️ 서버 전용 — 랜딩 CMS 콘텐츠 읽기/쓰기.
// 읽기: 공개 anon 클라이언트(site_content RLS select=true).
// 쓰기: service_role(RLS 우회) — 어드민 라우트에서 ADMIN_EMAILS 검증 후에만 호출.

import { createClient } from "@/modules/shared/lib/supabase/server";
import { createServiceRoleClient } from "@/modules/photobook/services/storigeServer";
import type { Json } from "@/modules/shared/types/database";
import {
  DEFAULT_LANDING_CONTENT,
  mergeLandingContent,
  type LandingContent,
} from "@/modules/landing/content";

const KEY = "landing";

/** 랜딩 콘텐츠 조회 — DB값을 기본값 위에 병합. 실패/미설정 시 기본값. */
export async function getLandingContent(): Promise<LandingContent> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (error) return DEFAULT_LANDING_CONTENT;
    return mergeLandingContent(data?.value);
  } catch {
    // 테이블 미적용(마이그레이션 전) 등 — 기본값으로 안전 폴백
    return DEFAULT_LANDING_CONTENT;
  }
}

/** 랜딩 콘텐츠 저장(어드민 전용, service_role). */
export async function saveLandingContent(value: LandingContent): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error("SERVICE_ROLE_NOT_CONFIGURED");
  const { error } = await admin.from("site_content").upsert({
    key: KEY,
    value: value as unknown as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
