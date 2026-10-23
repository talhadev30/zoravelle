import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { StoreSettings } from "@/lib/models";

const pages = {
  about: {
    title: "About Zoravelle",
    description:
      "Learn about Zoravelle and explore eyeglasses, sunglasses, blue-light frames, and kids' eyewear selected for everyday wear.",
    intro: "Considered eyewear, made to be seen in.",
    sections: [
      ["Designed for daily wear", "Explore familiar frame shapes, color choices, and lens options in one collection."],
      ["Find your next frame", "Browse eyeglasses, sunglasses, blue-light frames, and styles for kids. Each product page lists its measurements, stock, and available options."],
    ],
  },
  contact: {
    title: "Contact Zoravelle",
    description:
      "Contact Zoravelle for help with eyewear, frame fit, lens choices, orders, shipping, or returns. Send us a message using the contact form.",
    intro: "Need help choosing a frame or have a question about an order? Send our team a message.",
    sections: [["Get in touch", "Use the store contact details and include your order number when asking about an existing purchase."]],
  },
  faq: {
    title: "Eyewear and order FAQs",
    description:
      "Find answers about shopping Zoravelle eyewear, lens options, virtual try-on, orders, shipping, and returns.",
    intro: "Quick answers about frames, lens options, and shopping with Zoravelle.",
    sections: [
      ["How can I compare frames?", "Product pages show frame shape, material, colors, measurements, stock, and available lens choices."],
      ["How does virtual try-on work?", "Choose a supported frame, then upload a photo or use your camera to preview it. Virtual try-on is available on selected product pages."],
      ["Can I order prescription lenses?", "Available lens types are listed on each product page. Add the prescription numbers requested during checkout when you choose prescription lenses."],
      ["How do I ask about delivery or returns?", "Contact the store with your order number. The store can confirm the current delivery, return, and exchange options for your order."],
    ],
  },
  shipping: {
    title: "Shipping information",
    description:
      "Learn how Zoravelle shipping costs and delivery details are shown during checkout, and how to ask about an order.",
    intro: "Shipping costs and any free-shipping threshold are shown in the store and during checkout.",
    sections: [
      ["Shipping cost", "Orders that meet the current free-shipping threshold qualify as shown at checkout. Other orders display the applicable shipping amount before you place the order."],
      ["Delivery questions", "Contact the store with your order number for an update about an existing shipment."],
    ],
  },
  returns: {
    title: "Returns and exchanges",
    description:
      "Questions about a Zoravelle return or exchange? Contact the store with your order number to confirm the options for your purchase.",
    intro: "Contact the store to ask about a return or exchange for your order.",
    sections: [
      ["Start a request", "Include your order number and explain what you need help with. The store will confirm the options and next steps."],
      ["Before ordering", "Review the product measurements, available lens options, and checkout details before placing your order."],
    ],
  },
  "track-order": {
    title: "Track a Zoravelle order",
    description:
      "View your Zoravelle order number, status, items, and delivery details from your account.",
    intro: "Your order status and delivery details are available in your Zoravelle account.",
    sections: [["View your orders", "Sign in to see your order number, current status, delivery details, and items."]],
    link: ["/account", "Go to my account"],
  },
  prescription: {
    title: "Prescription lens options",
    description:
      "Explore prescription lens types and coatings available for selected Zoravelle eyeglasses. Product pages show current options and prices.",
    intro: "Choose a lens option that suits your prescription and everyday use.",
    sections: [
      ["Lens types", "Available frames may offer frame-only, non-prescription, single-vision, or progressive lens options. Check the product page for current availability and pricing."],
      ["Prescription details", "When you choose prescription lenses, enter the right- and left-eye values requested during checkout. Contact the store if you need help."],
      ["Coatings", "Some lens options include blue-cut, anti-glare, or photochromic coatings. Availability is shown on supported products."],
    ],
  },
  stores: {
    title: "Zoravelle store information",
    description:
      "Contact Zoravelle for store availability, frame fitting questions, and help comparing eyewear and lens options.",
    intro: "Get in touch with Zoravelle for frame-fit and lens-option questions.",
    sections: [["Contact", "Use the published store contact details to ask about availability or fitting help."]],
  },
  careers: {
    title: "Careers at Zoravelle",
    description:
      "Interested in working with Zoravelle? Send a short introduction and details about your experience to the store contact email.",
    intro: "We welcome a short introduction from people interested in working with Zoravelle.",
    sections: [["Work with us", "Email your introduction and experience to the contact address listed by the store."]],
  },
  privacy: {
    title: "Privacy policy",
    description:
      "Read how Zoravelle uses account, order, contact, and newsletter information to operate the eyewear storefront.",
    intro: "This policy explains the information used to provide accounts, shopping, and orders.",
    sections: [
      ["Information collected", "Accounts store your name, email, optional profile and delivery details, and either a password hash or Google account identifier. Orders store delivery details and the items submitted at checkout. Newsletter signups store an email address."],
      ["How information is used", "Account data supports sign-in, profile updates, checkout, and order history. Newsletter emails are used for the signup requested by the visitor."],
      ["Storage and browser data", "Account, order, and newsletter records are stored in MongoDB. The browser stores cart and wishlist data in local storage, and an HTTP-only cookie keeps the account session."],
      ["Your choices", "You can update profile details from your account. Contact the store for other data requests."],
    ],
  },
  terms: {
    title: "Terms and conditions",
    description:
      "Review the terms for Zoravelle accounts, product listings, pricing, checkout, delivery, and order questions.",
    intro: "These terms describe how accounts, product listings, and checkout work on this storefront.",
    sections: [
      ["Accounts", "Keep your sign-in details private and provide accurate account and delivery information. You can update your profile while signed in."],
      ["Products and orders", "Product descriptions, prices, and stock are managed by the store. Orders record the price and status at the time of purchase."],
      ["Shipping and returns", "Shipping charges are shown at checkout. Contact the store for questions about delivery, returns, or exchanges."],
      ["Updates", "Product availability and store information may change over time."],
    ],
  },
  cookies: {
    title: "Cookie and browser storage information",
    description:
      "Learn how Zoravelle uses browser storage for your cart and wishlist and an HTTP-only cookie for your sign-in session.",
    intro: "This site uses browser storage for your shopping bag and saved frames.",
    sections: [
      ["Shopping preferences", "Your cart and wishlist are stored in your browser. Your sign-in session uses an HTTP-only cookie."],
      ["Manage storage", "You can clear these values from your browser settings. Clearing your cart or wishlist removes those saved items from this browser."],
    ],
  },
  accessibility: {
    title: "Accessibility at Zoravelle",
    description:
      "Learn how to contact Zoravelle if a page, product detail, or control is difficult for you to use.",
    intro: "We want the store to work across different screens and with assistive technology.",
    sections: [
      ["Need help?", "Contact the store and tell us which page or control got in your way so we can help you complete your shopping task."],
    ],
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};

  const isNoIndex = slug === "track-order";
  const canonicalPath = "/" + slug;

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: canonicalPath,
    },
    ...(isNoIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: "Zoravelle",
      locale: "en_PK",
      title: `${page.title} | Zoravelle`,
      description: page.description,
      url: canonicalPath,
      images: [
        {
          url: "/images/hero.jpg",
          width: 1200,
          height: 630,
          alt: `${page.title} - Zoravelle`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${page.title} | Zoravelle`,
      description: page.description,
      images: ["/images/hero.jpg"],
    },
  };
}

export default async function InfoPage({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  let settings = { contactEmail: "", phone: "" };
  if (["contact", "stores", "careers"].includes(slug)) {
    try {
      await dbConnect();
      const storeSettings = await StoreSettings.findById("store")
        .select("contactEmail phone")
        .lean();
      settings = { ...settings, ...storeSettings };
    } catch {}
  }

  const contactDetails = [
    settings.contactEmail ? "Email: " + settings.contactEmail : "",
    settings.phone ? "Phone: " + settings.phone : "",
  ].filter(Boolean).join(" | ");
  let sections = page.sections;

  if (slug === "contact" || slug === "stores") {
    sections = [[
      slug === "contact" ? "Get in touch" : "Contact",
      contactDetails || "The store owner has not added contact details yet.",
    ]];
  }
  if (slug === "careers") {
    sections = [[
      "Work with us",
      settings.contactEmail
        ? "Send a short introduction to " + settings.contactEmail + "."
        : "The store owner has not added a contact email yet.",
    ]];
  }

  return (
    <main className="container-z min-h-[55vh] py-10 sm:py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-black/50">Zoravelle</p>
      <h1 className="mt-2 font-space text-4xl sm:text-5xl">{page.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-black/60">{page.intro}</p>
      <div className="mt-10 grid max-w-3xl gap-7">
        {slug === "contact" ? (
          <section className="rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-7" aria-labelledby="contact-title">
            <h2 id="contact-title" className="font-space text-2xl">Get in touch</h2>
            <p className="mt-3 leading-relaxed text-black/65">{contactDetails || "Use the form below to contact our team."}</p>
            <ContactForm />
          </section>
        ) : (
          sections.map(([title, text]) => (
            <section key={title} className="rounded-2xl border border-black/10 bg-white/60 p-5 sm:p-7">
              <h2 className="font-space text-2xl">{title}</h2>
              <p className="mt-3 leading-relaxed text-black/65">{text}</p>
            </section>
          ))
        )}
      </div>
      {page.link && (
        <Link href={page.link[0]} className="mt-7 inline-block rounded-full bg-black px-6 py-3 text-sm text-white">
          {page.link[1]}
        </Link>
      )}
    </main>
  );
}
