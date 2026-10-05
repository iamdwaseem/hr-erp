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

## 🔐 RBAC Roles & Permissions

| Role | Access Level | Description |
| :--- | :--- | :--- |
| `admin` | Full System Access | All permissions, user management, audit logs, employee master, R2 documents |
| `hr_manager` | Operational HR | Employee master full CRUD, document uploads/management, audit log viewing |
| `hr_officer` | HR Staff | Employee create/read/update, document uploads |
| `viewer` | Read Only | View employees and documents |

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
npm run db:migrate:remote
```

---

## 🚢 Cloudflare Deployment

```bash
npm run deploy
```
