"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function AccountActions() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/profile"
        className="rounded-full border border-black/20 px-5 py-2.5 text-sm"
      >
        Edit profile
      </Link>
      <button
        onClick={logout}
        className="rounded-full border border-black/20 px-5 py-2.5 text-sm"
      >
        Log out
      </button>
      <Link
        href="/shop"
        className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
      >
        Shop frames
      </Link>
    </div>
  );
}
