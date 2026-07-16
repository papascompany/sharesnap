// businessInfo.ts — 전자상거래법 §10(사업자 정보 표시) + 개인정보처리방침/약관 참조값의 단일 소스
//
// ⚠️ PLACEHOLDER — 사업자등록·통신판매업 신고 완료 후 실값으로 교체 필수.
//    법적 고지에 쓰이므로 허위 기재 금지: 확정 전 항목은 빈 문자열로 두면 화면에서 미표시된다.
//    이 파일 한 곳만 채우면 footer·이용약관·개인정보처리방침에 일괄 반영된다.
//    (자주 바뀌지 않고 법적 정확성이 중요해 CMS가 아닌 코드 상수로 관리)

export const BUSINESS_INFO = {
  /** 서비스명(브랜드) */
  serviceName: "ShareSnap",
  /** 운영 주체 상호 (예: (주)○○○) */
  companyName: "",
  /** 대표자명 */
  representative: "",
  /** 사업자등록번호 (000-00-00000) */
  businessNumber: "",
  /** 통신판매업 신고번호 */
  mailOrderNumber: "",
  /** 사업장 주소 */
  address: "",
  /** 고객 문의 이메일 (문의·개인정보 열람/삭제 요청·콘텐츠 신고 접수 창구) */
  email: "thestorige@gmail.com",
  /** 고객센터 전화(선택) */
  phone: "",
  /** 개인정보 보호책임자명(선택 — 미기재 시 대표자/문의 이메일로 갈음) */
  privacyOfficer: "",
} as const;

/** 이용약관·개인정보처리방침 시행일 — 운영 오픈 시 확정 */
export const LEGAL_EFFECTIVE_DATE = "2026-07-11";

/** 값이 채워진 사업자 정보만 [라벨, 값] 배열로 반환 — footer/법적 페이지에서 조건부 렌더 */
export function businessInfoRows(): Array<[string, string]> {
  const b = BUSINESS_INFO;
  const rows: Array<[string, string]> = [
    ["상호", b.companyName],
    ["대표자", b.representative],
    ["사업자등록번호", b.businessNumber],
    ["통신판매업 신고번호", b.mailOrderNumber],
    ["주소", b.address],
    ["문의", b.email],
    ["고객센터", b.phone],
  ];
  return rows.filter(([, v]) => v.length > 0);
}
