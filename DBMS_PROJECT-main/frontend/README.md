# CAMPUS MEMORY — Frontend

Campus Incident Memory and Investigation Management System (Frontend Application).

Built for academic project evaluation and institutional demonstration, this responsive frontend connects directly to the CAMPUS MEMORY FastAPI backend (`http://127.0.0.1:8000`), maintaining full temporal provenance, causal graph exploration, and evidence tracking.

---

## 1. Technology Stack

- **Framework:** React 18 with TypeScript 5
- **Bundler & Dev Server:** Vite 5
- **Routing:** React Router DOM 6
- **Styling:** Tailwind CSS with TasteSkill v2 App-Screen Design Principles
- **HTTP Client:** Axios with centralized interceptors, Bearer token injection, and structured backend error parsing
- **Icons:** Lucide React
- **Data Visualization & Charts:** Recharts (responsive categorical and severity bar/pie analytics)

---

## 2. Project Architecture & Directory Structure

```
frontend/
├── public/                  # Public static assets
├── src/
│   ├── assets/              # Icons and brand assets
│   ├── components/
│   │   ├── common/          # Reusable UI atoms (Badge, Button, Modal, Alert, StatCard, LoadingSpinner, EmptyState)
│   │   └── layout/          # Application shell (AppLayout, Sidebar, TopNavbar, Breadcrumbs)
│   ├── contexts/            # React context providers (AuthContext with session management)
│   ├── pages/
│   │   ├── auth/            # LoginPage & SignupPage
│   │   ├── dashboard/       # DashboardPage (KPI metrics, Recharts analytics, recent incidents)
│   │   ├── events/          # EventsListPage, CreateEventPage, EventDetailPage, EditEventPage
│   │   ├── investigations/  # InvestigationsPage (Root cause traversal & blast radius exploration)
│   │   ├── relationships/   # RelationshipsPage (Causal linkages, confirmation/downgrade workflows)
│   │   ├── evidence/        # EvidencePage (Chain of custody & corroborating document tracking)
│   │   ├── impacts/         # ImpactsPage (Quantifiable damages, financial, downtime, casualty tracking)
│   │   ├── reports/         # ReportsPage (Event summary, recurrence trends) & EventInvestigationReportPage
│   │   ├── references/      # ReferencesPage (Generic reference dataset inspection console)
│   │   ├── profile/         # ProfilePage (User identity, role policy guide, backend connectivity)
│   │   └── NotFoundPage.tsx # 404 handler
│   ├── routes/              # ProtectedRoute & AppRoutes router configuration
│   ├── services/            # Centralized API service layer
│   │   ├── apiClient.ts     # Axios instance, token storage, and Pydantic error parsers
│   │   ├── authService.ts   # Login, signup, health & readiness checks
│   │   ├── eventService.ts  # CRUD, temporal as-of queries, status transitions, close & void
│   │   ├── relationshipService.ts # Directed causal graphs, confirm/downgrade, and audit history
│   │   ├── evidenceService.ts     # Evidence linkage to relationships
│   │   ├── impactService.ts       # Granular impact creation & updates
│   │   ├── investigationService.ts# Root-cause & blast-radius graph traversals
│   │   ├── reportService.ts       # Summaries, recurrence, and institutional investigation dossiers
│   │   └── referenceService.ts    # Generic reference dataset lookup with memory caching
│   ├── types/               # TypeScript interfaces matching FastAPI Pydantic schemas
│   ├── utils/               # Date formatters with timezone provenance, badge variant mappers
│   ├── App.tsx              # Root component with providers
│   ├── main.tsx             # Application DOM entry point
│   └── index.css            # Tailwind directives and print stylesheets
├── .env.example             # Example environment variables
├── package.json             # Package manifest & scripts
├── tailwind.config.js       # Design tokens & color system
├── tsconfig.json            # TypeScript compiler configuration
└── vite.config.ts           # Vite configuration with @ alias
```

---

## 3. Prerequisites

- **Node.js:** v22.x or newer
- **npm:** v10.x or newer
- **Running Backend:** The CAMPUS MEMORY FastAPI backend running at `http://127.0.0.1:8000`

---

## 4. Installation & Setup

1. Open your terminal in the `frontend` folder:
   ```bash
   cd E:\Campus-Memory\frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_BASE_URL` matches your FastAPI backend address:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
   ```

---

## 5. Running the Application

### Development Server
```bash
npm run dev
```
The application will launch at:
`http://localhost:5173`

### Production Build
```bash
npm run build
```
Build output will be bundled cleanly into `dist/`.

---

## 6. How it Connects to the FastAPI Backend

1. **Authentication Flow:**
   - Public signup registers users with the `event_reporter` role (`POST /api/v1/auth/signup`).
   - Login submits email and password to `POST /api/v1/auth/login`.
   - On successful login, the returned JWT access token and user profile are saved in `localStorage`.
   - All subsequent requests attach the token automatically via the `Authorization: Bearer <token>` header in `apiClient.ts`.
   - If an endpoint returns HTTP 401, the session is invalidated safely and redirected to `/login`.

2. **Backend Authority:**
   - The browser never connects directly to PostgreSQL.
   - Status transitions strictly respect the backend transition matrix loaded from `GET /api/v1/reference/status_transitions`.
   - Confirming a relationship requires at least one attached evidence row, matching backend database rules.
   - Timestamps sent to the backend include explicit timezone offsets (ISO 8601 with tz).

---

## 7. Available Application Pages

1. **Sign In (`/login`) & Sign Up (`/signup`):**
   - Secure authentication with validation and error alerts.
2. **Dashboard (`/dashboard`):**
   - Live KPI cards (Open events, critical incidents, total registered).
   - Recharts visual analytics (Open events by severity, open events by category).
   - Recent open incidents table with quick inspection links.
3. **Events (`/events`):**
   - Comprehensive event search and multi-facet filtering (category, severity, status).
   - Temporal **As-Of Reconstruction Query**: inspect events as they were historically recorded at any past datetime (`GET /api/v1/events/as-of`).
4. **Report Incident (`/events/create`):**
   - Structured incident intake form with category-filtered event types and mandatory operational context (location, asset, service, or activity).
5. **Event Details (`/events/:eventId`):**
   - Overview & context details.
   - Status management modal (advance status, close with reason, void with reason).
   - Provenance status history audit timeline.
   - Causal relationships and attached evidence.
   - Quantified impact records.
6. **Edit Event (`/events/:eventId/edit`):**
   - Update mutable fields matching `PATCH /api/v1/events/{id}`.
7. **Investigations (`/investigations`):**
   - Upstream root-cause graph traversal.
   - Downstream blast-radius propagation with cumulative aggregated impacts.
   - Mode toggle: `Confirmed only` vs. `Include suspected`.
8. **Relationships (`/relationships`):**
   - Directed link creation between cause and effect incidents.
   - Status change controls: Confirm (requires evidence) and Downgrade.
   - Provenance history log and inline evidence attachment.
9. **Evidence & Chain of Custody (`/evidence`):**
   - Corroborating documents, sensor logs, CCTV records, and URLs attached to relationships.
10. **Impact Management (`/impacts`):**
    - Quantify damages, physical disruptions, downtime, or injuries with verification status ('verified' vs 'estimated' with mandatory basis).
11. **Institutional Reports (`/reports`):**
    - Date-range filtered Event Summary Report with KPI cards, charts, and group tables.
    - Recurrence analytics by campus location and hardware asset.
    - Print-friendly printable formatting.
12. **Forensic Investigation Dossier (`/reports/investigation/:eventId`):**
    - Full synthesized institutional dossier with graph traversal and evidence chain of custody.
13. **Reference Data Console (`/references`):**
    - Dynamic explorer for all 15 system reference collections (`/api/v1/reference/{name}`).
14. **Profile & Security (`/profile`):**
    - Current authenticated user, roles policy guide, and backend API status.

---

## 8. Known Backend Constraints & Design Decisions

1. **Public Registration:** Public signup strictly permits `role_code: "event_reporter"`. Other administrative roles are provisioned through backend procedures.
2. **No Hard Deletes:** In accordance with audit compliance, events cannot be deleted (`DELETE /events/{id}` returns 405 Method Not Allowed). The system provides a dedicated `Void` workflow with change reasoning.
3. **Relationship Confirmation:** The backend enforces that a relationship cannot be confirmed unless at least one supporting evidence row has been recorded.
4. **Timezone Awareness:** All datetime query filters and payload timestamps are ISO 8601 strings with explicit timezone offsets.

