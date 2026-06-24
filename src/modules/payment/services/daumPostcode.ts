"use client";

// Daum(카카오) 우편번호 서비스 — CDN 동적 로드 래퍼.
// 별도 키 불필요(무료). 팝업 레이어로 주소 검색 → 콜백으로 우편번호/주소 반환.

const SDK_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

interface DaumPostcodeData {
  zonecode: string; // 우편번호(5자리)
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  address: string; // 기본 주소(사용자 선택 타입)
  buildingName?: string;
  apartment?: "Y" | "N";
}

interface DaumPostcodeInstance {
  open(): void;
  embed(el: HTMLElement): void;
}

interface DaumPostcodeConstructor {
  new (opts: {
    oncomplete: (data: DaumPostcodeData) => void;
    onclose?: () => void;
  }): DaumPostcodeInstance;
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor };
  }
}

let loadPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있어요."));
  }
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("주소 검색을 불러오지 못했어요."));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

export interface PostcodeResult {
  zipcode: string;
  address: string;
}

/** 우편번호 검색 팝업을 열고, 선택 결과(우편번호+도로명주소)를 Promise로 반환. 취소 시 null. */
export async function openPostcodeSearch(): Promise<PostcodeResult | null> {
  await loadSdk();
  const Postcode = window.daum?.Postcode;
  if (!Postcode) throw new Error("주소 검색을 불러오지 못했어요.");

  return new Promise<PostcodeResult | null>((resolve) => {
    let completed = false;
    const instance = new Postcode({
      oncomplete: (data) => {
        completed = true;
        resolve({
          zipcode: data.zonecode,
          address: data.roadAddress || data.address || data.jibunAddress,
        });
      },
      onclose: () => {
        if (!completed) resolve(null);
      },
    });
    instance.open();
  });
}
