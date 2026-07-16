import { LoginPage } from "@/modules/auth/components/LoginPage";

export const metadata = {
  title: "로그인 — ShareSnap",
};

interface LoginPageRouteProps {
  // Next 16: searchParams는 Promise — await 필요
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function Page({ searchParams }: LoginPageRouteProps) {
  const { next, error } = await searchParams;
  return <LoginPage next={next} error={error} />;
}
