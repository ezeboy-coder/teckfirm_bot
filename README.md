# TeckFirm WiFi

Automated WiFi voucher sales platform for TeckFirm. Customers select a hotspot, choose a plan, pay, and receive an access voucher. This repository currently includes **Phase 1 (foundation)** and **Phase 2 (public website)**. Paystack charging is not enabled yet. Omada talks to the OC200 through **Omada Cloud Access**, not a local controller IP.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma
- Auth.js (NextAuth v5)
- Zod validation

## Local setup

### 1. Environment

```bash
cp .env.example .env
```

Generate an auth secret and put it in `.env`:

```bash
openssl rand -base64 32
```

`AUTH_SECRET` must be at least 32 characters. Do not use production Paystack or Omada credentials in development.

### 2. Database

Start PostgreSQL (and Redis for later phases).

**Option A — Docker**

```bash
docker compose up -d
```

**Option B — Homebrew Postgres** (used if Docker is not installed)

```bash
brew services start postgresql@16
```

Then apply migrations and load clearly labelled **DEMO** locations/plans:

```bash
npx prisma migrate dev
npx prisma db seed
```

Demo accounts (local development only):

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `demo.admin@teckfirm.org` | `DemoAdmin123!` |
| Customer | `demo.customer@example.com` | `DemoCustomer123!` |

Change these before any shared environment.

### 3. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run db:studio` | Prisma Studio |

## Architecture notes

- The backend is the authority. The browser never talks to Paystack or Omada with secret keys.
- Financial amounts are stored as integer **kobo**.
- Omada Cloud Access uses `OMADA_CLOUD_BASE_URL`, `OMADA_CLOUD_USERNAME`, and `OMADA_CLOUD_PASSWORD` on the server. Each location stores its own Omada Device ID and Omada ID in admin.
- Guest checkout is supported. Registration is optional.

## Phase map

1. Foundation — layouts, auth, schema, design system
2. Public website — landing, plans, locations, purchase assistant
3. Admin CRUD
4. Orders
5. Paystack
6. Mock vouchers
7. Live Omada
8. Customer accounts (deep)
9. Wallet
10. Admin operations
11. Hardening
12. Production

## Deployment

The app can run on Vercel or Docker. PostgreSQL should be a managed instance (Neon, RDS, and similar). The OC200 is reached through Omada Cloud Access over the internet. Do not point the app at a private `192.168.x.x` controller address.
