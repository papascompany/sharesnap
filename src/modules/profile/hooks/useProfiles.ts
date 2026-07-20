"use client";

// 사용자 프로필 배치 조회 훅 — 채팅/사진/코멘트/멤버 목록의 작성자 표시용.
// 프로필은 부가 정보라 로딩/실패 시에도 화면은 폴백("나"/"멤버")으로 동작한다.

import { useEffect, useState } from "react";
import { getProfiles, type Profile } from "@/modules/profile/services/profileService";

export function useProfiles(userIds: string[]): Map<string, Profile> {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());

  // 조회 키 — 정렬된 고유 id 문자열(배열 참조 변화로 인한 무한 재조회 방지)
  const key = [...new Set(userIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    // setState는 promise 콜백에서만 (effect 동기 setState 금지 룰)
    getProfiles(key.split(","))
      .then((map) => {
        if (!cancelled) setProfiles(map);
      })
      .catch(() => {
        // 프로필 조회 실패는 무시 — 폴백 표시
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return profiles;
}
