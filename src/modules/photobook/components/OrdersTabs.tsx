"use client";

import { useState } from "react";
import { cn } from "@/modules/shared/lib/utils";
import { PhotobookList } from "@/modules/photobook/components/PhotobookList";
import { PrintOrderList } from "@/modules/print-order/components/PrintOrderList";

type Tab = "photobook" | "print";

/** 주문 내역 — 포토북 / 사진 인화 탭 전환. */
export function OrdersTabs() {
  const [tab, setTab] = useState<Tab>("photobook");

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-14 z-20 flex gap-1 border-b border-border/50 bg-background/80 px-4 pt-1 backdrop-blur-xl">
        <TabButton active={tab === "photobook"} onClick={() => setTab("photobook")}>
          포토북
        </TabButton>
        <TabButton active={tab === "print"} onClick={() => setTab("print")}>
          사진 인화
        </TabButton>
      </div>
      {tab === "photobook" ? <PhotobookList mode="orders" /> : <PrintOrderList />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 pb-2.5 pt-1.5 text-[15px] font-semibold transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity",
          active ? "bg-primary opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}
