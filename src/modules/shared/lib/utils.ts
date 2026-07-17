// 공용 유틸리티 — cn은 shadcn 표준 위치(@/lib/utils)를 그대로 재수출

export { cn } from "@/lib/utils";

// 한국어 상대 시간 표시 (예: "3분 전")
export function formatRelativeTime(date: string | Date): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.floor((Date.now() - target.getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}시간 전`;
  if (diffSec < 604_800) return `${Math.floor(diffSec / 86_400)}일 전`;
  return target.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// YYYY.MM.DD HH:mm
export function formatDate(date: string | Date): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return target.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// 8자리 영숫자 share_code 생성 (충돌 검사는 호출측에서)
// crypto.getRandomValues — 비암호학적 Math.random 대체(share_code 추측 저항, 감사 P1).
// chars 길이 32는 2^32의 약수라 % 연산에 modulo bias가 없다(균등 분포).
export function generateShareCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(arr[i] % chars.length);
  }
  return out;
}

// 파일명 sanitize — Storage 경로용
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 100);
}

// 바이트 -> "1.2 MB"
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
