// 트위터 카드 = OG 이미지 재사용 (동일 1200×630 디자인)
// runtime은 재수출 시 Next/Turbopack이 인식 못 하므로 로컬 선언.
export { default, alt, size, contentType } from "./opengraph-image";
export const runtime = "edge";
