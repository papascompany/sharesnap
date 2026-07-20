// 택배 배송 조회 — 택배사별 조회 URL 템플릿(외부 API 연동 없이 링크만으로 추적 경험 제공)

export const CARRIERS = {
  cj: {
    label: "CJ대한통운",
    url: (no: string) =>
      `https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(no)}`,
  },
  lotte: {
    label: "롯데택배",
    url: (no: string) =>
      `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${encodeURIComponent(no)}`,
  },
  hanjin: {
    label: "한진택배",
    url: (no: string) =>
      `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${encodeURIComponent(no)}`,
  },
  logen: {
    label: "로젠택배",
    url: (no: string) =>
      `https://www.ilogen.com/web/personal/trace/${encodeURIComponent(no)}`,
  },
  post: {
    label: "우체국택배",
    url: (no: string) =>
      `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
  },
  etc: {
    label: "기타",
    url: () => "",
  },
} as const;

export type CarrierKey = keyof typeof CARRIERS;

export function isCarrierKey(v: string | null | undefined): v is CarrierKey {
  return Boolean(v && v in CARRIERS);
}

export function carrierLabel(key: string | null | undefined): string {
  return isCarrierKey(key) ? CARRIERS[key].label : (key ?? "택배");
}

/** 조회 URL — 지원 택배사 + 송장번호가 모두 있을 때만 반환 */
export function trackingUrl(
  key: string | null | undefined,
  number: string | null | undefined,
): string | null {
  if (!isCarrierKey(key) || !number) return null;
  const url = CARRIERS[key].url(number);
  return url || null;
}
