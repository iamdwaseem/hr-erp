# HR ERP MVP - Cloudflare Workers Architecture

A lightweight, enterprise-ready Human Resources ERP MVP built for edge performance, low latency, and zero cold starts on Cloudflare Workers.

## 🚀 Tech Stack

- **Edge API:** [Hono v4](https://hono.dev/) running on Cloudflare Workers
- **Database:** Cloudflare D1 (Serverless SQLite at the edge) with [Drizzle ORM](https://orm.drizzle.team/)
- **Document Storage:** Cloudflare R2 (S3-compatible edge object storage)
- **Frontend:** React 18, Vite, TypeScript
- **Styling & UI:** Tailwind CSS, shadcn/ui design patterns, Lucide React
- **Data & State Management:** TanStack Query v5, Context API
- **Form & Validation:** React Hook Form, Zod
- **Authentication & RBAC:** Edge JWT (`jose`), Role-Based Access Control matrix

---

## 🏗️ Architecture & Directory Structure

```text
hr-erp/
├── drizzle/                     # Drizzle D1 SQLite migrations
├── src/
│   ├── api/                     # Cloudflare Worker / Hono Backend
│   │   ├── db/                  # Drizzle ORM client and D1 schemas
│   │   │   ├── client.ts        # Database client factory
│   │   │   └── schema/          # Drizzle table schemas (users, audit_logs)
│   │   ├── middleware/          # Edge middlewares (auth, rbac, logger, error)
│   │   ├── routes/              # Modular Hono API endpoints (/health, /auth)
│   │   ├── utils/               # JWT sign/verify, standardized responses
│   │   ├── index.ts             # Worker entry point
│   │   └── types.ts             # Cloudflare environment bindings & context types
│   ├── shared/                  # Isomorphic shared code (Client + Worker)
│   │   ├── constants/           # Roles and RBAC permissions matrix
│   │   ├── schemas/             # Zod validation schemas
│   │   └── types/               # API contracts and auth types
│   └── client/                  # React Frontend (Vite SPA)
│       ├── components/
│       │   ├── layout/          # AppLayout, Sidebar, Header, ProtectedRoute
│       │   └── ui/              # Button, Card, Badge, Input, Label
│       ├── context/             # AuthContext (session, token, role helpers)
│       ├── hooks/               # useAuth custom hook
│       ├── lib/                 # Typed apiClient, QueryClient, utils
│       ├── pages/               # Login, Dashboard, Module placeholders
│       ├── App.tsx              # App provider tree and routing
│       ├── index.css            # Tailwind CSS variables & tokens
│       └── main.tsx             # React entry point
├── drizzle.config.ts            # Drizzle kit configuration for D1
├── vite.config.ts               # Vite bundler with /api proxy to Wrangler
├── wrangler.jsonc               # Cloudflare Workers, D1, R2 & Assets config
└── tsconfig.json                # Project references (app, worker, node)
```

---

## RBAC Roles & Permissions

| Role | Access Level | Description |
| :--- | :--- | :--- |
| `ADMIN` | Full System Access | All permissions, user/master management, audit logs, employee hard-delete, and module administration |
| `HR` | Operational HR | Employee create/read/update, documents, salary, payroll, gratuity, payslips, and transport management; no hard-delete of protected records |

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy local environment templates:
```bash
cp .dev.vars.example .dev.vars
cp .env.example .env
```

### 3. Apply Local D1 Database Migrations
```bash
npm run db:migrate:local
```

### 4. Run Development Servers
```bash
# Runs both Vite frontend (port 5173) and Wrangler worker (port 8787)
npm run dev
```

Default bootstrap administrator for development:
- **Email:** `admin@hr-erp.local`
- **Password:** `AdminPassword123!`

---

## 🧪 Verification & Quality Checks

```bash
# Type check all project references
npm run check

# Build production assets
npm run build

# Generate database migrations
npm run db:generate

# Apply migrations to remote Cloudflare D1
npx wrangler d1 migrations apply hr-erp-db --remote

# Seed the local development administrator
npm run seed:admin

# Run the end-to-end verification suites (requires the local API on port 8787)
npm run verify
```

### Transport Operations

Transport supports Dubai labour-force operations through recurring route assignments and daily dispatch:

- Assign employees by route, accommodation/camp, work shift, pickup point, and effective dates.
- Plan a dated pickup or dropoff trip for a route and shift.
- Automatically build the trip roster from active employee assignments.
- Track boarded, absent, and replaced passengers and move trips through planned, ready, in-progress, and completed states.
- Configure route stops through the transport API using `/api/transport/routes/:routeId/stops`.

Apply migration `0010_transport_operations.sql` locally before using daily dispatch:

```bash
npm run db:migrate:local
```

### Attendance And Leave

Attendance imports are intentionally leave-only by default. Upload an `.xlsx`, `.xls`, or `.csv` file in **Attendance Import**, map the employee and date columns, preview the normalized rows, and import only explicit leave entries. Missing spreadsheet rows are not treated as absence.

**Leave Management** supports leave types, yearly balances, HR/Admin leave requests, approval/rejection, and attendance materialization. Payroll uses weekday baselines and reduces payable days only for unpaid leave; paid leave does not reduce salary.

```bash
# Apply attendance and leave tables locally
npm run db:migrate:local

# Verify import, balance, approval, and payroll integration
npm run verify:attendance-leave
```

---

## 🚢 Cloudflare Deployment

```bash
npm run deploy
```
