"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingDone } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !onboardingDone && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [user, loading, onboardingDone, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
        <div className="text-[var(--text-color)]">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Se o onboarding não estiver feito e a rota não for /onboarding, esconde o conteúdo até redirecionar
  if (!onboardingDone && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
