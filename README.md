# Solar Quotation OS

Quotation management for solar installers. Manage leads, configure products and pricing, generate branded PDF quotations (PKR), and track follow-ups. Built for the Pakistan solar market.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL 15+, managed (Neon/Supabase) or self-hosted |
| PDFs | PDFKit (server-rendered, A4) |

## Requirements

- **Node.js 20+**
- **A PostgreSQL database** — the app reads `DATABASE_URL`. Free managed option: [Neon](https://neon.tech) (a project gives you a connection string; it also keeps 7 days of automatic point-in-time backups).

## Setup

1. Create a Neon project and copy its connection string.
2. Configure the backend:

```bash
cd backend
npm install
copy .env.example .env        # Windows — adjust as needed
# In .env, set:  DATABASE_URL=postgresql://...
npm run migrate               # create tables
npm run seed                  # load demo data (fresh DB only)
```

3. Frontend:

```bash
cd frontend
npm install
```

## Run

```bash
# Terminal 1 — backend on :5000
cd backend
npm run dev                   # nodemon

# Terminal 2 — frontend on :3000 (proxies /api to :5000)
cd frontend
npm run dev
```

Open http://localhost:3000.

Demo accounts (from `npm run seed`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sunpeak.pk` | `admin123` |
| Salesperson | `sales1@sunpeak.pk` | `sales123` |

## Config (.env)

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Backend port |
| `DATABASE_URL` | — | **PostgreSQL connection string (required)** |
| `DATABASE_SSL` | `true` | Set `false` for a local Postgres without SSL |
| `JWT_SECRET` | — | **Change this before any real use** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | `test` | WhatsApp Cloud API credentials; placeholders = messaging disabled |
| `WHATSAPP_APP_SECRET` | — | Meta app secret; when set, webhook signatures are verified |
| `DEFAULT_COUNTRY` / `DEFAULT_CURRENCY` | `PK` / `PKR` | Locale defaults |

## Tests

```bash
cd backend
npm test        # node --test — 25 tests: auth, leads, quotations/PDF, roles, CSV import
```

Each test run uses its own throwaway schema (`sqos_test_*`) on your `DATABASE_URL`, created on boot and dropped on close. Your data is never touched.

## Backup

```bash
cd backend
npm run backup
```

Runs `pg_dump` (PostgreSQL client tools) to `backend/backups/solar-<timestamp>.sql`. On Neon, backups are also automatic via point-in-time restore (7 days on the free tier).

## Product CSV Import

Admins can bulk-import products from **Products → Import CSV**. Required columns: `name`, `unit_price`. Optional: `unit`, `cost_price`, `brand`, `model`, `category` (created automatically if missing), `description`. Example:

```csv
name,unit,unit_price,cost_price,brand,model,category
585W Mono Panel,piece,28000,25000,JA Solar,JAM72S30,Solar Panels
Installation & Commissioning,kW,10000,8000,Service,INSTALL,Services
```

## Core API

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/login` | JWT + user info |
| GET/POST | `/api/leads` | List / create leads |
| GET/PUT/DELETE | `/api/leads/:id` | Lead detail / update / delete |
| GET/POST | `/api/products` | Catalog (admin write) |
| POST | `/api/products/import` | CSV upload, admin only |
| GET | `/api/quotations` | List quotations |
| POST | `/api/quotations/generate` | Build quote from a lead |
| GET | `/api/quotations/:id/pdf` | Branded PDF (A4) |
| PUT | `/api/quotations/:id/status` | draft/sent/accepted/rejected |
| GET/PUT | `/api/settings/company` | Company profile + logo + brand color |
| GET/PUT | `/api/settings/pricing-rules` | Margin, tax, installation, transport |
| GET/PUT | `/api/settings/sizing-rules` | Consumption → system size mapping |
| GET/POST | `/api/settings/team` | Team members |

## Quotation PDF Branding

Under **Settings → Company Profile** you can upload a logo (PNG/JPG ≤ 1 MB) and pick a brand color. Both are applied to generated PDFs: the logo renders in the header and the brand color accents the header bar, section headings, and total.

## Deferred / Roadmap

- **Deployment** — host backend + built frontend on Render/Railway free tier and point `DATABASE_URL` at Neon.
- **Real WhatsApp Cloud API** — set credentials in `.env`; inbound webhook (`/api/whatsapp/webhook`) is already wired with HMAC verification.
- **Billing / payments** — not yet implemented.

## Notes

- PowerShell 5.1: use `curl.exe -F` (no `-F` on `Invoke-RestMethod`) and quote globs in `npm test`.