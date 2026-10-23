import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminDashboard from "./AdminDashboard";
export const metadata = { title: "Store admin | Zoravelle", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "admin") redirect("/account");
  return <AdminDashboard />;
}
