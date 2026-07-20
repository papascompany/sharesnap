"use client";

// PWA 설치 / 외부 브라우저 유도 배너 (docs/ux-flows.md §5.3)
//
// 왜 필요한가(감사 P2): 세션이 카카오톡 인앱 웹뷰 저장소에 갇히면 쿠키가 랜덤 소실될 수 있고
// (카카오 공식 보장 없음), 인앱에서는 PWA 설치·웹푸시가 불가하다. 홈 화면 PWA는 자체 저장소를
// 쓰는 유일한 안정 컨텍스트이므로, "가치를 경험한 직후"에 한 번만 이동을 권한다.
//
// 노출 규칙: 참여 완료 등 가치 경험 직후 1회 → 닫으면 14일간 재노출 없음(localStorage).

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { isKakaoInApp, isIos, openExternalBrowser } from "@/modules/shared/utils/browserEnv";

const DISMISS_KEY = "pwa-prompt-dismissed-at";
const DISMISS_DAYS = 14;

/** beforeinstallprompt 이벤트(표준 타입 미제공) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeNoop() {
  return () => {};
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari 홈 화면 실행
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const inKakaoApp = useSyncExternalStore(subscribeNoop, isKakaoInApp, () => false);
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // 설치 가능 이벤트 수신(외부 브라우저 · Android Chrome 등)
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // 기본 미니 인포바 억제 → 우리 배너로 유도
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  // 노출 판정 — 이미 설치(standalone)했거나 최근 닫았으면 skip
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    // 인앱은 설치 자체가 불가 → 외부 브라우저 이동 안내로 노출
    // 외부 브라우저는 beforeinstallprompt를 받은 경우에만 노출(설치 가능 확정)
    const showable = inKakaoApp || deferred !== null;
    if (!showable) return;
    const timer = setTimeout(() => setVisible(true), 1200); // 화면 안정 후 표시
    return () => clearTimeout(timer);
  }, [inKakaoApp, deferred]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장 실패는 무시 — 다음 세션에 다시 보일 뿐
    }
  }

  async function handleAction() {
    if (inKakaoApp) {
      // 비공식 스킴이라 실패할 수 있음 → 실패 시 URL 복사 폴백(감사 권고)
      const url = window.location.href;
      const timer = setTimeout(() => {
        void navigator.clipboard
          ?.writeText(url)
          .then(() =>
            toast.success(
              "주소를 복사했어요. 브라우저에 붙여넣어 열어 주세요.",
            ),
          )
          .catch(() =>
            toast.error("브라우저에서 직접 열어 주세요."),
          );
      }, 1200);
      // 페이지를 실제로 벗어나면 타이머는 의미 없어짐
      window.addEventListener("pagehide", () => clearTimeout(timer), {
        once: true,
      });
      openExternalBrowser(url);
      return;
    }

    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") toast.success("홈 화면에 추가했어요!");
      setDeferred(null);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 animate-fade-up">
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">
            {inKakaoApp ? "브라우저에서 열어보세요" : "홈 화면에 추가하기"}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {inKakaoApp
              ? "사진이 올라올 때 바로 확인하고, 매번 로그인하지 않아도 돼요."
              : isIos()
                ? "공유 버튼 → '홈 화면에 추가'를 누르면 앱처럼 쓸 수 있어요."
                : "앱처럼 빠르게 열고 로그인도 유지돼요."}
          </p>
          {/* iOS 외부 브라우저는 자동 설치 프롬프트가 없어 안내만 */}
          {inKakaoApp || deferred ? (
            <button
              type="button"
              onClick={() => void handleAction()}
              className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition active:scale-95"
            >
              {inKakaoApp ? (
                <>
                  <ExternalLink className="size-3.5" aria-hidden />
                  브라우저로 열기
                </>
              ) : (
                <>
                  <Download className="size-3.5" aria-hidden />
                  추가하기
                </>
              )}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted active:scale-90"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
