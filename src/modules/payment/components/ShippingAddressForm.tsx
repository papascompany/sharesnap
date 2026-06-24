"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { openPostcodeSearch } from "@/modules/payment/services/daumPostcode";

export interface ShippingFormState {
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string;
}

export const EMPTY_SHIPPING: ShippingFormState = {
  recipientName: "",
  recipientPhone: "",
  zipcode: "",
  address: "",
  addressDetail: "",
  memo: "",
};

/** 배송지가 결제 가능한 최소 요건을 갖췄는지. */
export function isShippingValid(s: ShippingFormState): boolean {
  return Boolean(
    s.recipientName.trim() &&
      s.recipientPhone.trim().length >= 9 &&
      s.zipcode.trim() &&
      s.address.trim() &&
      s.addressDetail.trim(),
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/70";

export function ShippingAddressForm({
  value,
  onChange,
}: {
  value: ShippingFormState;
  onChange: (patch: Partial<ShippingFormState>) => void;
}) {
  const [searching, setSearching] = useState(false);

  async function searchAddress() {
    setSearching(true);
    try {
      const result = await openPostcodeSearch();
      if (result) {
        onChange({ zipcode: result.zipcode, address: result.address });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주소 검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold">받는 분</span>
          <input
            value={value.recipientName}
            onChange={(e) => onChange({ recipientName: e.target.value })}
            placeholder="이름"
            autoComplete="name"
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">연락처</span>
          <input
            value={value.recipientPhone}
            onChange={(e) =>
              onChange({
                recipientPhone: e.target.value.replace(/[^0-9-]/g, ""),
              })
            }
            placeholder="010-0000-0000"
            inputMode="tel"
            autoComplete="tel"
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
      </div>

      <div>
        <span className="text-[13px] font-semibold">배송지</span>
        <div className="mt-1.5 flex gap-2">
          <input
            value={value.zipcode}
            readOnly
            placeholder="우편번호"
            className={`${inputCls} max-w-[120px] cursor-default bg-muted/40`}
          />
          <button
            type="button"
            onClick={searchAddress}
            disabled={searching}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-[14px] font-semibold text-primary transition active:scale-[0.97] disabled:opacity-60"
          >
            {searching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Search className="size-4" aria-hidden />
            )}
            주소 찾기
          </button>
        </div>
        <input
          value={value.address}
          readOnly
          placeholder="기본 주소 (주소 찾기로 입력)"
          className={`mt-2 ${inputCls} cursor-default bg-muted/40`}
        />
        <input
          value={value.addressDetail}
          onChange={(e) => onChange({ addressDetail: e.target.value })}
          placeholder="상세 주소 (동/호수 등)"
          className={`mt-2 ${inputCls}`}
        />
      </div>

      <label className="block">
        <span className="text-[13px] font-semibold">
          배송 메모{" "}
          <span className="font-normal text-muted-foreground">(선택)</span>
        </span>
        <input
          value={value.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
          placeholder="예) 부재 시 경비실에 맡겨주세요"
          className={`mt-1.5 ${inputCls}`}
        />
      </label>
    </div>
  );
}
