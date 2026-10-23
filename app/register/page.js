import { Suspense } from "react";
import AuthForm from "@/app/auth/AuthForm";
export const metadata = { title: "Register | Zoravelle", robots: { index: false, follow: false } };
export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="container-z py-20">Loading…</main>}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
