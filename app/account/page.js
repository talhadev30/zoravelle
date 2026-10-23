import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Order } from "@/lib/models";
import AccountActions from "./AccountActions";
import AccountFeedbackForm from "@/components/ui/AccountFeedbackForm";
import { formatCurrency } from "@/lib/storefront";

export const metadata = {
  title: "Your account | Zoravelle",
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");
  await connectDB();
  const orders = await Order.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return (
    <main className="container-z min-h-[55vh] py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-black/50">
            Your account
          </p>
          <h1 className="mt-2 font-space text-4xl sm:text-5xl">
            Hello, {user.name}
          </h1>
          <p className="mt-2 text-sm text-black/55">{user.email}</p>
        </div>
        <AccountActions />
      </div>
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="mt-7 inline-block rounded-xl bg-black px-5 py-3 text-sm text-white"
        >
          Open store admin
        </Link>
      )}
      <AccountFeedbackForm userName={user.name} />
      <section className="mt-10">
        <h2 className="font-space text-2xl">Your orders</h2>
        <p className="mt-1 text-sm text-black/55">
          Order updates and delivery status appear here.
        </p>
        {orders.length ? (
          <div className="mt-4 grid gap-4">
            {orders.map((order) => (
              <article
                key={order.orderNo}
                className="rounded-2xl border border-black/10 bg-white/60 p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-xs text-black/50">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-sm">
                    {order.status}
                  </span>
                </div>
                <ul className="mt-4 space-y-1 text-sm text-black/70">
                  {order.items.map((item, index) => (
                    <li key={index}>
                      {item.qty} × {item.name} · {item.color}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-right font-medium">
                  {"Total " + formatCurrency(order.total)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white/60 p-8 text-center">
            <p>You haven’t placed an order yet.</p>
            <Link href="/shop" className="mt-3 inline-block underline">
              Browse frames
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
