"use client";

// Kakao JS SDK 동적 로드 + 초기화 헬퍼 + Feed 템플릿 빌더

import { APP_URL } from "@/modules/shared/lib/constants";

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

interface KakaoSdk {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (params: KakaoSendDefaultParams) => void;
  };
}

export interface KakaoSendDefaultParams {
  objectType: "feed" | "list" | "location" | "commerce" | "text";
  content: {
    title: string;
    description?: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons?: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
}

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const KAKAO_SDK_INTEGRITY =
  "sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka";

let loadPromise: Promise<KakaoSdk> | null = null;

export function loadKakaoSdk(): Promise<KakaoSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 사용 가능합니다."));
  }
  if (window.Kakao && window.Kakao.isInitialized()) {
    return Promise.resolve(window.Kakao);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const existing = document.getElementById("kakao-sdk") as HTMLScriptElement | null;
    const onReady = () => {
      const sdk = window.Kakao;
      if (!sdk) {
        reject(new Error("Kakao SDK 로드 실패"));
        return;
      }
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY 환경변수가 없습니다."));
        return;
      }
      if (!sdk.isInitialized()) sdk.init(key);
      resolve(sdk);
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Kakao SDK 스크립트 로드 실패")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-sdk";
    script.src = KAKAO_SDK_URL;
    script.integrity = KAKAO_SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = onReady;
    script.onerror = () =>
      reject(new Error("Kakao SDK 스크립트 로드 실패"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function shareKakaoFeed(params: KakaoSendDefaultParams) {
  const sdk = await loadKakaoSdk();
  sdk.Share.sendDefault(params);
}

// ===== Feed 템플릿 빌더 (docs/ux-flows.md §4.1) =====

/** 공유 시나리오: 초대 / 새 사진 리마인드 / 포토북 완성 */
export type FeedVariant = "invite" | "newPhotos" | "photobook";

interface FeedTemplateParams {
  roomName: string;
  shareCode: string;
  imageUrl?: string;
  photoCount?: number;
  memberCount?: number;
}

/**
 * 시나리오별 카카오 Feed 템플릿 생성
 * - 버튼은 행동이 아니라 보상을 약속하는 문구 (예: "사진 보러 가기")
 * - 링크는 모두 /join/{shareCode} — 이미 멤버면 /join 분기에서 즉시 방으로 이동
 * - 이미지가 없으면 앱 아이콘(PNG)으로 폴백 (카카오 최소 200×200 요건 충족)
 */
export function buildFeedTemplate(
  variant: FeedVariant,
  params: FeedTemplateParams,
): KakaoSendDefaultParams {
  const { roomName, shareCode, imageUrl, photoCount, memberCount } = params;
  const joinUrl = `${APP_URL}/join/${shareCode}`;
  const link = { mobileWebUrl: joinUrl, webUrl: joinUrl };
  const resolvedImageUrl = imageUrl ?? `${APP_URL}/icons/icon-512.png`;

  let title: string;
  let description: string;
  let buttonTitle: string;

  switch (variant) {
    case "newPhotos":
      title = `새 사진 ${photoCount ?? 0}장이 올라왔어요`;
      description = `'${roomName}'에 새로운 추억이 도착했어요. 놓치기 전에 확인하세요`;
      buttonTitle = "지금 확인하기";
      break;
    case "photobook":
      title = "포토북이 완성됐어요";
      description =
        photoCount !== undefined
          ? `'${roomName}'에서 함께 모은 ${photoCount}장이 한 권의 책으로`
          : `'${roomName}'의 추억이 한 권의 책으로`;
      buttonTitle = "포토북 구경하기";
      break;
    case "invite":
    default: {
      title = `'${roomName}' 사진 보러 가기`;
      const stats = [
        photoCount !== undefined ? `사진 ${photoCount}장` : null,
        memberCount !== undefined ? `멤버 ${memberCount}명` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      description = stats
        ? `${stats} — 우리 사진 함께 모아요`
        : "우리 사진 함께 모아요";
      buttonTitle = "사진 보러 가기";
      break;
    }
  }

  return {
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: resolvedImageUrl,
      link,
    },
    buttons: [{ title: buttonTitle, link }],
  };
}
