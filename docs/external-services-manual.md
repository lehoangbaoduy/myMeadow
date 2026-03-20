# MyMeadow — External Services Manual

---

## 1. Turso (Database Hosting)

**Dashboard:** [turso.tech](https://turso.tech) → sign in → **mymeadow** database

### Connection details (in `.env`)
```
TURSO_DATABASE_URL=libsql://mymeadow-duyle2408.aws-us-east-2.turso.io
TURSO_AUTH_TOKEN=<your token>
```

### Running a schema migration
Whenever you add a new field to `prisma/schema.prisma`:
```bash
# 1. Regenerate the Prisma client
npx prisma generate

# 2. Push the column to Turso
npm run db:migrate "ALTER TABLE TableName ADD COLUMN columnName TYPE DEFAULT value"
```

**Common SQL patterns:**
```bash
# Nullable text
npm run db:migrate "ALTER TABLE Tenant ADD COLUMN myField TEXT"

# Boolean (false by default)
npm run db:migrate "ALTER TABLE Tenant ADD COLUMN myFlag INTEGER NOT NULL DEFAULT 0"

# Boolean (true by default)
npm run db:migrate "ALTER TABLE Tenant ADD COLUMN myFlag INTEGER NOT NULL DEFAULT 1"
```

> SQLite (Turso) only supports `ADD COLUMN` — dropping or renaming columns requires recreating the table.

### Viewing data
Turso dashboard → **mymeadow** → **Shell** tab → run raw SQL:
```sql
SELECT * FROM Tenant;
```

---

## 2. Vercel (Project Deployment)

**Dashboard:** [vercel.com](https://vercel.com) → sign in → **MyMeadow** project

### Deployments
- Every `git push` to the `main`/`starter` branch **auto-deploys**
- View build logs: Vercel dashboard → project → **Deployments** → click latest

### Environment variables
Vercel dashboard → project → **Settings** → **Environment Variables**

Current variables that must be set:
| Key | Value |
|---|---|
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | `MyMeadow <noreply@meadowwood.homes>` |
| `TEXTBELT_API_KEY` | Textbelt API key |
| `TEXTBELT_ENABLED` | `true` or `false` |

> After adding/changing any env var, go to **Deployments** → **Redeploy** for changes to take effect.

### Viewing runtime errors
Vercel dashboard → project → **Logs** tab → filter by `Error`

---

## 3. Textbelt (SMS Notifications)

**Website:** [textbelt.com](https://textbelt.com)

### How it works
When admin clicks **Remind Trash** or **Remind Bathroom**, an SMS is sent to the tenant's phone number stored in their profile.

### Enabling / disabling
Controlled by a flag in `.env` — no code change needed:
```
TEXTBELT_ENABLED=true    # SMS will be sent
TEXTBELT_ENABLED=false   # SMS skipped, no credits used
```
> Also update this in **Vercel environment variables**.

### Checking remaining credits
Go to [textbelt.com](https://textbelt.com) → enter your API key → **Check Key** — shows remaining SMS credits.

### Buying more credits
[textbelt.com](https://textbelt.com) → **Buy Credits** — $0.005/SMS, credits never expire.

### Tenant phone number format
Must include country code. Enter in the tenant's profile:
```
+1 4196999534   ← US number
```

---

## 4. Porkbun (Domain Registration)

**Dashboard:** [porkbun.com](https://porkbun.com) → sign in → **Account** → **Domain Management**

### Domain
`meadowwood.homes` — registered here, renews annually.

### Managing DNS records
1. Domain Management → click `meadowwood.homes` → **DNS**
2. Add/edit/delete records here

### DNS records currently added (for Resend)
After verifying with Resend, the following records should be present:
- **TXT** — SPF record (`v=spf1 include:amazonses.com ~all`)
- **TXT** — DKIM records (two entries, long keys)
- **TXT** — DMARC record (optional)

### Renewing the domain
Porkbun sends reminder emails before expiry. Renew at: Domain Management → `meadowwood.homes` → **Renew**.

---

## 5. Resend (Email Notifications)

**Dashboard:** [resend.com](https://resend.com) → sign in

### How it works
When admin clicks **Remind Trash** or **Remind Bathroom**, an email is sent to the tenant's email address stored in their profile.

### API key (in `.env`)
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=MyMeadow <noreply@meadowwood.homes>
```

### Verified domain
`meadowwood.homes` is verified under Resend → **Domains**. Status should show **Verified**. If it ever shows **Failed**, re-add the DNS records in Porkbun.

### Checking sent emails
Resend dashboard → **Emails** tab — shows every sent email with status (delivered, bounced, etc.)

### Free tier limits
- **3,000 emails/month** free
- 100 emails/day cap on free plan
- More than enough for this app's use case

### Tenant email
Enter in the tenant's profile page or via Admin → Residents → Edit. Must be a valid email address.

---

## Quick Reference — What to update when things change

| Situation | What to do |
|---|---|
| Add new DB field | Edit schema → `npx prisma generate` → `npm run db:migrate "ALTER TABLE..."` |
| Change env variable | Update `.env` locally + Vercel env vars + redeploy |
| Tenant moves in | Add tenant in Admin → Residents, set phone + email in their profile |
| Tenant moves out | Admin → Residents → **Deactivate** (removes from rotation) |
| SMS not sending | Check `TEXTBELT_ENABLED=true` in Vercel env vars, check credits on Textbelt |
| Email not sending | Check Resend → Emails tab for errors, verify domain still shows **Verified** |
| Domain expiring | Renew at Porkbun before expiry date |
