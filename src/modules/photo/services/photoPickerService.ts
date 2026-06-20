"use client";

// 사진 선택 추상화 서비스
// 현재는 input[type=file] 동적 생성 방식 (웹/PWA)
// ⚠️ 추후 Capacitor(iOS App Store) 전환 시 이 함수 내부에서
//    @capacitor/camera 플러그인으로 분기하는 지점 — 시그니처는 유지할 것

export interface PickPhotosOptions {
  /** true면 모바일에서 카메라 직접 촬영 (capture="environment") */
  capture?: boolean;
  /** 다중 선택 허용 (기본 true) */
  multiple?: boolean;
}

/**
 * 사진 선택 다이얼로그를 열고 선택된 파일 목록을 반환
 * - 사용자가 취소하면 빈 배열 resolve
 */
export function pickPhotos(options: PickPhotosOptions = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = options.multiple ?? true;
    if (options.capture) {
      // 모바일 브라우저에서 후면 카메라 직접 실행
      input.setAttribute("capture", "environment");
    }
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };

    input.addEventListener("change", () => {
      finish(input.files ? Array.from(input.files) : []);
    });
    // 최신 브라우저의 취소 이벤트 — 미지원 브라우저는 input이 잔류하지만 무해
    input.addEventListener("cancel", () => finish([]));

    input.click();
  });
}
