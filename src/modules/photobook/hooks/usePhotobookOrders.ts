"use client";

import { useEffect, useState } from "react";
import { getMyPhotobookOrders } from "@/modules/photobook/services/photobookService";
import type { PhotobookOrderListItem } from "@/modules/photobook/types";

/** 내 포토북 주문 목록 조회 훅 (마운트 시 1회 로드). */
export function useMyPhotobookOrders() {
  const [orders, setOrders] = useState<PhotobookOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    getMyPhotobookOrders()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { orders, isLoading, error };
}
