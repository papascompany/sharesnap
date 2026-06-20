// 인증 모듈 타입

import type { User, Session } from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
}

export interface KakaoProfile {
  nickname: string | null;
  avatarUrl: string | null;
  email: string | null;
}
