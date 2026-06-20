import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/modules/shared/lib/supabase/server";
import { ErrorBoundary } from "@/modules/shared/components/ErrorBoundary";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
