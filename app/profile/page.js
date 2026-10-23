import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProfileForm from "./ProfileForm";
export const metadata = { title: "My profile | Zoravelle", robots: { index: false, follow: false } };
export default async function ProfilePage({ searchParams }) {
  const query = await searchParams;
  const complete = Array.isArray(query.complete) ? query.complete[0] : query.complete;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fprofile");
  return (
    <main className="container-z min-h-[55vh] py-10 sm:py-14">
      <p className="text-xs uppercase tracking-[0.18em] text-black/50">
        Your account
      </p>
      <h1 className="mt-2 font-space text-4xl sm:text-5xl">Profile details</h1>
      <p className="mt-3 max-w-xl text-sm text-black/55">
        Update the contact and delivery details saved to your account.
      </p>
      <ProfileForm user={user} completing={complete === "1"} />
    </main>
  );
}
