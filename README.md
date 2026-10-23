🕶️ Zoravelle

Zoravelle is a responsive, high-performance e-commerce storefront for eyewear built with Next.js 16, MongoDB, and Mongoose. It features clean component modularity, real-time inventory management, custom AI image enhancement/virtual try-on capabilities, and automated transaction emails via Resend.

📸 Overview & Features

Customer Storefront

Dynamic Product Catalog: Browse products with filterable dynamic categories, stock status, customer reviews, and ratings.

Account Management: Order tracking, purchase history, profile details, and account feedback.

Seamless Checkout: Streamlined Cash-on-Delivery (COD) checkout process with automated transaction emails.

Interactive Features: Virtual try-on module, image uploads, dynamic announcements, and promotional newsletter subscription.

OAuth Authentication: Dual authentication supporting email/password credential login and Google OAuth 2.0.

Admin Dashboard (/admin)

Catalog Management: Add, update, and remove products, pricing, stock counts, and variants.

Order Processing: Update order fulfillment statuses and monitor buyer history.

Store Configuration: Customize header announcements, contact information, and free shipping order thresholds.

Integrated Media Management: Direct image uploads powered by ImageKit and AI-assisted background/enhancement workflows.

🛠️ Tech Stack

Framework: Next.js 16 (App Router)

Language: JavaScript (ES6+) / Node.js (v20.9+)

Database & ORM: MongoDB Atlas (Mongoose ODM with transaction support)

Styling: Tailwind CSS, Framer Motion

Storage & Media: ImageKit API, Sharp

AI Processing: Cloudflare Workers AI / Image Services

Email Delivery: Resend API

Icons & UI: Lucide React

🚀 Getting Started

Follow these steps to set up and run Zoravelle locally on your machine.

Prerequisites

Node.js: v20.9.0 or higher

npm: v10.0.0 or higher

MongoDB: A running MongoDB replica set or MongoDB Atlas instance (required for Mongoose multi-document transactions).

1. Clone the Repository & Install Dependencies

git clone https://github.com/your-username/zoravelle.git
cd zoravelle
npm ci


2. Configure Environment Variables

Create a .env.local file in the project root by copying the template:

cp .env.example .env.local


Fill in the required values inside .env.local:

# Mandatory Settings
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/zoravelle?retryWrites=true&w=majority
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Configuration (Resend)
RESEND_API_KEY=re_123456789...
RESEND_FROM_EMAIL=Zoravelle <orders@yourverifieddomain.com>
CONTACT_TO_EMAIL=support@yourdomain.com

# Google OAuth Authentication
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Admin ImageKit Storage
IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id

# Cloudflare AI & Image Enhancement (Virtual Try-On)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
IMAGE_PROCESSING_FALLBACK=false


⚠️ Security Warning: Never commit .env.local or push private API keys to GitHub.

3. Start the Development Server

npm run dev


Open http://localhost:3000 in your browser to view the storefront.

👤 Admin Setup

Open your browser and navigate to /register to create a new user account.

Open your database (via MongoDB Compass or MongoDB Atlas UI).

Find your newly created document in the users collection.

Update the user's role field from "user" to "admin":

{
  "role": "admin"
}


Log out and log back in. You now have full administrative access at /admin.

📧 Email Setup (Resend)

Contact & Orders: Messages sent via /contact and new order notifications are routed to CONTACT_TO_EMAIL (or the store contact email configured in Store Settings).

Welcome Emails: Triggered automatically upon initial email password registration or first-time Google OAuth registration.

Server-Side Execution: All email operations execute on the server-side; API keys are never exposed to the client bundle. Email failures are logged safely without halting checkout or registration flows.

🔐 Google Authentication Setup

Go to the Google Cloud Console > APIs & Services > Credentials.

Create an OAuth 2.0 Client ID (Application type: Web application).

Add Authorized Redirect URIs:

Development: http://localhost:3000/api/auth/google/callback

Production: https://your-domain.com/api/auth/google/callback

Copy the Client ID and Client Secret into your .env.local or production environment settings.

📦 Production Deployment

Because Zoravelle uses Node.js native packages (Sharp), MongoDB transactions, and server-side API processing, it must be run on a Node.js server engine (e.g., Vercel, Render, Railway, or VPS using PM2/Nginx). Static HTML export (next export) is not supported.

Build & Execution Workflow

Set all environment variables on your hosting provider's dashboard.

Ensure NEXT_PUBLIC_SITE_URL is set to your live https:// domain.

Run the deployment pipeline:

# 1. Install exact production dependencies
npm ci

# 2. Verify code quality
npm run lint

# 3. Create production build
npm run build

# 4. Start production server
npm start


Production Security Checklist

[ ] Database Connection: Connect to a MongoDB replica set (such as MongoDB Atlas) with IP access control limited to your application host.

[ ] WAF & Rate Limiting: Enforce request body limits on sensitive routes (/api/auth/*, /api/contact, /api/newsletter, /api/feedback, /api/products/*/reviews, /api/try-on):

JSON Bodies: Max 64 KB

Image Uploads: Max 10 MB

[ ] Health Monitoring: Ping /api/health continuously for uptime monitoring and automated host health checks.

📁 Project Directory Structure

my_website/
├── app/                  # Next.js App Router pages, dynamic routes ([slug]), & API endpoints
├── components/           # UI components organized by module (admin, home, product, ui)
├── hooks/                # Custom React hooks (e.g., useImageUpload)
├── lib/                  # Database connections, authentication, email templates, utilities
├── public/               # Static public assets and default images
├── services/             # Third-party integrations (ImageKit, Cloudflare AI processing)
├── .env.example          # Environment variables template
├── next.config.mjs       # Next.js runtime configuration
└── package.json          # Dependencies and scripts


📄 License

This project is proprietary and built specifically for Zoravelle Eyewear. All rights reserved.