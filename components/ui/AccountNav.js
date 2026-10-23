"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "lucide-react";

const accountSlotClass = "ms-1 flex h-10 w-11 shrink-0 items-center justify-center rounded-full border border-black/20 text-sm sm:w-24";

export default function AccountNav() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <span aria-hidden="true" className="ms-1 h-10 w-11 shrink-0 sm:w-24" />;
  }

  return (
    <Link
      href={user ? "/account" : "/login"}
      aria-label={user ? "Your account" : "Log in"}
      className={accountSlotClass}
    >
      <User size={18} />
      <span className="ms-2 hidden whitespace-nowrap sm:inline">
        {user ? "Account" : "Log in"}
      </span>
    </Link>
  );
}