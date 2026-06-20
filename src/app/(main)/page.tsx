import { redirect } from "next/navigation";

export default function MainHomePage() {
  // 로그인 후 기본 진입점은 공유방 목록
  redirect("/rooms");
}
