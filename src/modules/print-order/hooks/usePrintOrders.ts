"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyPrintOrders } from "@/modules/print-order/services/printOrderService";
import type { PrintOrderListItem } from "@/modules/print-order/types";

/** 내 인화 주문 목록 — setState는 promise 콜백에서만(effect 동기 setState 방지). */
export function useMyPrintOrders() {
  const [orders, setOrders] = useState<PrintOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback((): Promise<void> => {
    return getMyPrintOrders()
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("인화 주문 로드 실패"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { orders, isLoading, error, refresh };
}
