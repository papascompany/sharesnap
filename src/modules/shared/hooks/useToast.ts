"use client";

// shadcn 최신 버전은 sonner 기반이므로 useToast는 sonner의 toast를 래핑한다.
import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  description?: string;
  duration?: number;
};

export function useToast() {
  return {
    toast: (message: string, options?: ToastOptions) =>
      sonnerToast(message, options),
    success: (message: string, options?: ToastOptions) =>
      sonnerToast.success(message, options),
    error: (message: string, options?: ToastOptions) =>
      sonnerToast.error(message, options),
    info: (message: string, options?: ToastOptions) =>
      sonnerToast.info(message, options),
    warning: (message: string, options?: ToastOptions) =>
      sonnerToast.warning(message, options),
  };
}

export { sonnerToast as toast };
