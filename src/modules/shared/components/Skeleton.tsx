"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/modules/shared/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * 스켈레톤 프리미티브 — globals.css의 `skeleton` 유틸리티(shimmer 포함) 기반.
 * 실제 콘텐츠와 동일한 레이아웃 골격을 그리는 데 사용한다 (design-system.md §3.4).
 * 전체 화면 차단 로딩(인증 확인 등)과 버튼 인라인 로딩은 LoadingSpinner를 유지.
 *
 * 사용 예:
 *   <Skeleton className="aspect-[2/1] rounded-2xl" />
 *   <Skeleton className="h-4 w-24" />
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("skeleton", className)} aria-hidden {...props} />;
}
