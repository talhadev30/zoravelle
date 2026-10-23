"use client";
import Link from "next/link";
import useStoreSettings from "@/lib/useStoreSettings";
export default function BrandLink({ footer = false }) {
  const settings = useStoreSettings();
  return <Link href="/" className={footer ? "block max-w-full truncate text-3xl font-bold tracking-tighter" : "min-w-0 max-w-[42vw] truncate text-xl font-space font-extrabold tracking-[-1.3px] text-[#111] sm:text-[23px] xl:max-w-none"}>{settings.storeName.toLowerCase()}{footer ? null : <span className="text-red-800"> .</span>}</Link>;
}
