import CartClient from "./CartClient";

export const metadata = {
  title: "Your bag | Zoravelle",
  description: "Review the eyewear and lens options in your shopping bag.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient />;
}
