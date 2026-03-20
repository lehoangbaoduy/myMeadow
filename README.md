# MyMeadow

A residential property management web app for shared housing. Tracks utility bills, maintenance requests, kitchen inventory, trash schedules, and announcements — with an admin/tenant role split and AI-powered OCR for utility documents.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS, Recharts |
| Auth | Clerk |
| Database | SQLite (local) / Turso LibSQL (production) |
| ORM | Prisma 7 + LibSQL adapter |
| AI/OCR | Anthropic Claude API |
| File Storage | Local disk (dev) / Vercel Blob (production) |
| Deployment | Vercel |

---

## Features

**Admin**
- Manage tenant profiles (activate/deactivate, assign rooms)
- Post and delete announcements
- Upload utility bills (PDF) with AI-powered OCR to auto-extract billing data
- View and manage maintenance requests
- Manage kitchen inventory

**Tenant**
- View personal profile and utility bills
- Submit maintenance requests
- View announcements, trash schedule, and inventory
- Receive in-app notifications

**Shared**
- Light / dark mode
- Role-based access control (Admin / Tenant)
- Rotating trash duty schedule

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Clerk](https://clerk.com) account
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone and install

```bash
git clone https://github.com/your-username/mymeadow.git
cd mymeadow
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Anthropic (OCR)
ANTHROPIC_API_KEY=sk-ant-...

# Admin role — comma-separated list of emails that get ADMIN role on registration
ADMIN_EMAILS=you@example.com

# Database (local dev — no change needed)
# DATABASE_URL is only required for production (Turso)
```

### 3. Set up the local database

```bash
npx prisma db push
```

### 4. (Optional) Seed with sample data

```bash
npx prisma db seed
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in page path (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | Redirect after sign-in (`/`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | Redirect after sign-up (`/`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for OCR |
| `ADMIN_EMAILS` | Yes | Comma-separated emails granted admin on registration |
| `DATABASE_URL` | Production only | Turso LibSQL URL with auth token: `libsql://...?authToken=...` |
| `TURSO_DATABASE_URL` | Production only | Turso database URL (without token) |
| `TURSO_AUTH_TOKEN` | Production only | Turso auth token |
| `BLOB_READ_WRITE_TOKEN` | Production only | Vercel Blob token (auto-added by Vercel) |

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected pages (admin, profile, utilities, etc.)
│   ├── api/                # API route handlers
│   │   ├── announcements/
│   │   ├── inventory/
│   │   ├── maintenance-requests/
│   │   ├── notifications/
│   │   ├── register/
│   │   ├── remind/
│   │   ├── tenants/
│   │   ├── trash-schedule/
│   │   └── utilities/
│   ├── register/           # First-time user onboarding
│   ├── sign-in/            # Clerk sign-in page
│   └── list/               # Public resident list
├── components/             # Reusable UI components
└── lib/
    ├── auth.ts             # Role helpers (getCurrentUser, requireAdmin)
    ├── prisma.ts           # Prisma client singleton
    └── trash-schedule.ts   # Trash rotation logic
prisma/
├── schema.prisma           # Database schema (10 models)
├── seed.ts                 # Dev seed data
└── migrations/             # Prisma migrations
```

---

## Database Schema

| Model | Description |
|-------|-------------|
| `User` | Clerk identity + role (ADMIN / TENANT) |
| `Tenant` | Resident profile — name, room, avatar, DOB |
| `UtilityBill` | Monthly bill totals (electric, gas, water, wifi) |
| `UtilityDocument` | Uploaded PDF bill files with OCR metadata |
| `MaintenanceRequest` | Repair/issue tickets submitted by tenants |
| `TrashAssignment` | Rotating trash duty schedule |
| `Announcement` | Admin bulletin board posts |
| `Notification` | In-app notifications per user |
| `InventoryItem` | Shared kitchen inventory items |
| `InventoryRunOut` | Stockout alerts for inventory items |

---

## Deployment

Deployed on **Vercel** with **Turso** (database) and **Vercel Blob** (file storage).

### Services required

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Vercel](https://vercel.com) | Host the Next.js app | Yes |
| [Turso](https://turso.tech) | Remote SQLite (LibSQL) database | 500 MB / 1B reads |
| [Vercel Blob](https://vercel.com/storage/blob) | Store uploaded PDF documents | 1 GB |
| [Clerk](https://clerk.com) | Authentication | 10,000 MAU |
| [Anthropic](https://console.anthropic.com) | Claude API for OCR | Pay-per-use |

### Deploy steps

1. **Create a Turso database** at [turso.tech](https://turso.tech) and get your URL + auth token.

2. **Push the schema** to Turso (run locally with Turso credentials in `.env`):
   ```bash
   npx prisma db push
   ```

3. **Push to GitHub** and import the repo on [vercel.com](https://vercel.com).

4. **Add environment variables** in Vercel project settings (all variables from the table above).

5. **Enable Vercel Blob** — Storage tab → Connect Store → Blob → link to project.

6. **Update Clerk** — add your Vercel production URL to allowed redirect URLs in the Clerk dashboard.

7. Deploy.

---

## User Registration Flow

1. User signs up via Clerk (`/sign-in`)
2. Redirected to `/register` to complete their profile (name, gender, DOB, phone)
3. If their email matches `ADMIN_EMAILS`, they get the `ADMIN` role — otherwise `TENANT`
4. All future sign-ins go directly to the dashboard

---

## OCR — Utility Bill Parsing

Admins can upload a PDF utility bill on the Utilities page. The app sends it to the Claude API (`claude-sonnet-4-6`) which extracts:

- Billing month / year
- Total amount due
- Usage quantity (kWh, m³)
- Price per unit

The extracted data is pre-filled into the bill form for review before saving.
