# WindIQ — UK Wind Generation Forecast Decision-Support & Accuracy Analytics Dashboard

> **Product Scope Statement:**  
> WindIQ is a specialized **forecast visibility and forecast-accuracy decision-support tool** designed for a UK energy utility team purchasing electricity through the UK day-ahead wholesale electricity market. It is **not** a procurement optimizer, trading recommendation engine, or automated trade execution system. Wind forecast error alone is insufficient to calculate procurement need without electricity demand, wholesale price curves, generation portfolios, and contract hedge positions.

---

## 1. Product Summary and Intended Users

### Intended Audience
UK energy utility power purchasing teams, risk managers, and day-ahead wholesale electricity traders who schedule and procure electricity against expected intermittent renewable generation.

### Business Value
In the UK day-ahead electricity market, purchasing decisions must be committed prior to market gate closures using only the forecast information that was available at that exact point in time. WindIQ enables decision-makers to:
1. Reconstruct and inspect the exact national wind generation forecast vintage that was knowable at the chosen decision cutoff.
2. Objectively benchmark those as-of forecasts against actual outturn generation from the transmission system operator.
3. Identify systematic forecasting bias (chronic over- or under-forecasting) and peak delivery error periods to adjust day-ahead operating margins.

---

## 2. Core Features and Functionality

- **As-of Decision Cutoff Forecast Selection:** Reconstructs the exact forecast available at a user-defined gate closure by filtering publication vintages to those published at or before the cutoff time. Forecasts published after cutoff are strictly excluded.
- **Official Elexon BMRS Live Data Integration:** Live integration with official Elexon Insights Solution streams (`FUELHH` for actual wind generation outturns and `WINDFOR` for historical forecast vintages).
- **Forecast vs. Actual Time-Series Visualization:** High-contrast time-series comparison showing actual generation alongside the selected as-of forecast vintage with genuine gap preservation for missing periods.
- **Signed Forecast Error Analysis:** Delivery-period signed error chart ($Forecast - Actual$) centered on a zero baseline, highlighting significant deviations ($\ge 1,000\text{ MW}$) in amber.
- **Accurate Accuracy Metrics:** Autoritative calculations for Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Mean Signed Bias, and Maximum Absolute Miss across matched delivery periods.
- **Full Coverage & Data Quality Accounting:** Explicit accounting for expected (48 half-hour settlement periods), matched, missing forecast, and missing actual periods. Missing values are never filled with zero.
- **Interactive Delivery Period Table & Vintage Inspector:** Sortable, filterable table linking delivery periods directly to charts and an interactive Vintage Inspector detailing publication timestamps and selection rules.

---

## 3. Architecture Overview

WindIQ is architected as a cohesive, modular client-server web application with a strictly defined and documented REST API contract:

```
[ Frontend: React + TypeScript + Vite + Tailwind CSS ]
                        │
                        ▼ (HTTP GET /api/analysis?decision_date=...&cutoff=...)
[ Backend: FastAPI + Pydantic + HTTPX (Async) ]
       │                                     │
       ├─► [ Bounded In-Memory Vintage Cache ]
       │
       ▼ (HTTPS Async Client)
[ Elexon BMRS API v1 (data.elexon.co.uk) ]
  ├── FUELHH Stream (Actuals: fuelType=WIND)
  └── WINDFOR Stream (Forecast Vintages)
```

### Module Responsibilities

#### Backend (`/backend`)
- **`app/core/config.py`**: Validated environment configuration via Pydantic Settings (API base URL, timeouts, CORS origins, cache TTL, default cutoff).
- **`app/schemas/forecast.py`**: Authoritative Pydantic schemas for request validation, error envelopes, and canonical response structures.
- **`app/services/elexon_client.py`**: Dedicated, encapsulated HTTP client for Elexon BMRS endpoints with timeout handling and error mapping.
- **`app/services/data_normalizer.py`**: Normalizes upstream timestamps to timezone-aware UTC, parses MW generation, filters fuel types, and deterministically deduplicates records.
- **`app/services/forecast_service.py`**: Dedicated as-of cutoff vintage selection engine enforcing gate closure rules and deterministic tie-breaking.
- **`app/services/metrics_service.py`**: Computes MAE, RMSE, Signed Bias, Max Error, and settlement coverage strictly across matched periods.
- **`app/services/analysis_service.py`**: Orchestrates data retrieval, normalization, selection, matching, and response composition.
- **`app/utils/datetime_utils.py`**: Timezone conversion between `Europe/London` and UTC, delivery date derivation, and settlement period generation.
- **`app/utils/cache.py`**: Thread-safe bounded TTL in-memory LRU cache storing raw vintage streams to enable instant cutoff recalibration without stale pre-selections.

#### Frontend (`/frontend`)
- **`services/apiClient.ts`**: Base HTTP client with `fetch`, AbortSignal support, URL parameter serialization, and structured error extraction.
- **`services/forecastService.ts`**: Strongly-typed analysis service interacting with backend routes.
- **`hooks/useForecastAnalysis.ts`**: Single source of state for request lifecycle, in-flight cancellation via `AbortController`, and stale response protection.
- **`features/forecast/`**: Domain components including `DecisionContextPanel`, `ForecastActualChart`, `ForecastErrorChart`, `DeliveryPeriodTable`, and `ForecastVintagePanel`.
- **`components/ui/`**: Reusable design primitives (`Button`, `Card`, `Select`, `Tooltip`, `Skeleton`, `EmptyState`, `MetricCard`, `DataStatusBanner`).

---

## 4. Project Directory Structure

```text
windiq/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # FastAPI route definitions & parameter validation
│   │   ├── core/
│   │   │   └── config.py             # Pydantic Settings application configuration
│   │   ├── schemas/
│   │   │   └── forecast.py           # Canonical Pydantic request/response models
│   │   ├── services/
│   │   │   ├── analysis_service.py   # Complete workflow orchestration
│   │   │   ├── data_normalizer.py    # Upstream data parsing and deduplication
│   │   │   ├── elexon_client.py      # Async HTTPX client for Elexon BMRS
│   │   │   ├── forecast_service.py   # As-of cutoff vintage selection engine
│   │   │   └── metrics_service.py    # Error metrics and coverage calculations
│   │   ├── utils/
│   │   │   ├── cache.py              # Thread-safe bounded TTL cache
│   │   │   └── datetime_utils.py     # Timezone-aware UK and UTC date utilities
│   │   ├── __init__.py
│   │   └── main.py                   # FastAPI app, CORS, error handlers, ASGI server
│   ├── tests/
│   │   ├── test_api.py               # API route integration and error tests
│   │   ├── test_data_normalizer.py   # Normalizer and deduplication unit tests
│   │   ├── test_forecast_selection.py# As-of cutoff vintage selection unit tests
│   │   └── test_metrics.py           # Hand-calculated error and coverage tests
│   ├── .env.example
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── favicon.svg               # WindIQ energy vector favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI primitives (Button, Card, Select, etc.)
│   │   │   ├── DataStatusBanner.tsx  # Source provenance and completeness banner
│   │   │   ├── ErrorState.tsx        # Structured error display with retry
│   │   │   └── MetricCard.tsx        # High-contrast KPI metric cards
│   │   ├── features/
│   │   │   └── forecast/
│   │   │       ├── charts/
│   │   │       │   ├── ForecastActualChart.tsx # Recharts time-series comparison
│   │   │       │   └── ForecastErrorChart.tsx  # Recharts signed error bar chart
│   │   │       └── components/
│   │   │           ├── DecisionContextPanel.tsx# Date & cutoff controls
│   │   │           ├── DeliveryPeriodTable.tsx # Sortable settlement table
│   │   │           └── ForecastVintagePanel.tsx# Vintage inspector panel
│   │   ├── hooks/
│   │   │   └── useForecastAnalysis.ts# Data fetching hook with request cancellation
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx         # Main layout wrapper
│   │   │   └── Sidebar.tsx           # Navy brand navigation sidebar
│   │   ├── pages/
│   │   │   └── ForecastDashboard.tsx # Main dashboard page
│   │   ├── services/
│   │   │   ├── apiClient.ts          # Native fetch client with error normalization
│   │   │   └── forecastService.ts    # Typed API service
│   │   ├── types/
│   │   │   └── forecast.ts           # Shared TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── date.ts               # Europe/London time formatters
│   │   │   ├── errors.ts             # Error extraction utilities
│   │   │   └── format.ts             # Numeric & MW formatters
│   │   ├── __tests__/
│   │   │   ├── ForecastDashboard.test.tsx # Component and integration tests
│   │   │   └── setup.ts              # Vitest setup
│   │   ├── App.tsx
│   │   ├── index.css                 # Tailwind directives and custom styles
│   │   └── main.tsx
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts            # Brand design tokens (Navy, Blue, Teal, Amber)
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 5. Technology Stack

| Technology | Role |
| :--- | :--- |
| **Python 3.12** | Backend language runtime |
| **FastAPI** | High-performance ASGI web framework and routing |
| **Pydantic v2 / Settings** | Strict schema validation, data serialization, and configuration |
| **HTTPX** | Asynchronous HTTP client for upstream Elexon BMRS communication |
| **Uvicorn** | ASGI server for production deployment and local serving |
| **pytest** | Backend unit and integration testing framework |
| **React 19** | Component-based frontend library |
| **TypeScript 5.8** | Static type safety and data contract alignment with backend |
| **Vite 6** | Frontend development server and optimized build bundler |
| **Tailwind CSS 3.4** | Utility-first responsive styling matching approved design specs |
| **Recharts 3.10** | SVG time-series and bar chart visualizations with gap handling |
| **Lucide React** | Consistent, accessible iconography |
| **Vitest & Testing Library** | Component and user interaction testing |
| **Docker & Docker Compose** | Containerization and multi-container orchestration |

---

## 6. Official Data Sources

All actual and forecast wind generation data is fetched directly and exclusively from **Elexon BMRS** (the official Balancing Mechanism Reporting Service for Great Britain):

- **API Documentation & OpenAPI Catalogue:**  
  [https://bmrs.elexon.co.uk/api-documentation](https://bmrs.elexon.co.uk/api-documentation)  
  [https://data.elexon.co.uk/swagger/v1/swagger.json](https://data.elexon.co.uk/swagger/v1/swagger.json)
- **API Base URL:**  
  `https://data.elexon.co.uk/bmrs/api/v1` (Open access, no API key required)

### 1. Actual National Wind Generation — `FUELHH` Stream
- **Official Documentation:** [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
- **Operational Endpoint:** `GET /datasets/FUELHH/stream`
- **Query Parameters Used:**
  - `settlementDateFrom={YYYY-MM-DD}`
  - `settlementDateTo={YYYY-MM-DD}`
  - `fuelType=WIND`
- **Semantics:** Returns actual outturn wind generation in **MW** for all half-hourly settlement periods (1–48) on the delivery date. `startTime` represents the beginning of the 30-minute delivery period.

### 2. Wind Generation Forecasts — `WINDFOR` Stream
- **Official Documentation:** [https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)
- **Operational Endpoint:** `GET /datasets/WINDFOR/stream`
- **Query Parameters Used:**
  - `publishDateTimeFrom={ISO_UTC}`
  - `publishDateTimeTo={ISO_UTC}`
- **Semantics:** Returns wind generation forecasts in **MW** with both target delivery period `startTime` and forecast issuance timestamp `publishTime`. It provides the complete historical evolution of forecasts published prior to gate closure.

---

## 7. Understanding `startTime` vs. `publishTime`

Every forecast record in Elexon BMRS contains two distinct timestamps that must never be conflated:

- `startTime`: The **delivery period** in time for which the generation is being forecast (e.g., `2026-01-16T00:00:00Z`).
- `publishTime`: The **publication vintage timestamp** when that forecast version was issued and made publicly available by National Grid ESO / Elexon (e.g., `2026-01-15T09:30:00Z`).

**Analytical Rule:** Actual generation and forecasts are matched strictly by delivery period (`startTime`), while forecast eligibility is determined strictly by publication time (`publishTime <= cutoff`).

---

## 8. Forecast Vintage Selection Methodology

To evaluate what forecast information was available at the decision cutoff, WindIQ enforces a strict **as-of cutoff selection algorithm**:

1. **Timezone Normalization:** Both the cutoff time (configured in `Europe/London`) and all record timestamps (`publishTime`, `startTime`) are normalized to timezone-aware UTC.
2. **Exclusion of Future Information:** Any forecast record where `publishTime > cutoff_utc` is strictly excluded. (A forecast published after the cutoff could not have been known by the purchasing utility at decision time).
3. **Selection of Latest Eligible Vintage:** For each delivery period (`startTime`), the algorithm filters the eligible records and selects the one with the maximum `publishTime`.
4. **Deterministic Tie-Breaking:** If two records share the identical `startTime` and `publishTime`, the record with the higher generation value is deterministically retained.
5. **Missing Forecast Representation:** If no eligible vintage exists prior to cutoff for a delivery period, the period is explicitly classified as `missing_forecast` with a `null` value. It is **never** forward-filled, interpolated, or coerced to zero.

---

## 9. Metric Definitions and Conventions

All error metrics are calculated strictly over **matched settlement periods** (where both an eligible forecast and an actual generation outturn exist). If no matched periods exist, all metrics evaluate to `null` (displayed as `Unavailable` / `—`).

Let $F_i$ be the selected forecast generation in MW, and $A_i$ be the actual outturn generation in MW for settlement period $i \in \{1, \dots, N\}$:

- **Signed Forecast Error ($e_i$):**
  $$e_i = F_i - A_i$$
  - **Positive error ($e_i > 0$):** Overforecast (the model predicted more wind than actually occurred).
  - **Negative error ($e_i < 0$):** Underforecast (actual wind generation exceeded the forecast).
- **Absolute Error ($|e_i|$):**
  $$|e_i| = |F_i - A_i|$$
- **Mean Absolute Error (MAE):**
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |F_i - A_i|$$
- **Root Mean Squared Error (RMSE):**
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2}$$
- **Mean Signed Bias:**
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^N (F_i - A_i)$$
  - Positive bias indicates systematic overforecasting on average across the day.
  - Negative bias indicates systematic underforecasting on average.
- **Maximum Absolute Error:**
  $$\text{Max Miss} = \max_{i} |F_i - A_i|$$
  Accompanied by `maxErrorDeliveryStart` identifying the specific settlement period where this miss occurred.

---

## 10. Timezone and Delivery Date Semantics

- **User-Facing Timezone:** `Europe/London`. In January 2026, London is on Greenwich Mean Time (GMT, UTC+00:00). All internal logic utilizes Python's IANA `ZoneInfo("Europe/London")` rather than naive datetimes or hard-coded offsets.
- **Internal Storage & Comparison:** All comparisons and database operations are executed strictly in UTC with timezone-aware datetimes.
- **Decision Date to Delivery Date Mapping:**  
  Consistent with UK day-ahead wholesale procurement operations, the default delivery date is modeled as the calendar day immediately following the decision date:
  $$\text{deliveryDate} = \text{decisionDate} + 1\text{ day}$$
  *(For a decision made on 2026-01-15, the delivery date evaluated is 2026-01-16).*

---

## 11. Known Limitations & Market Assumptions

1. **Unspecified Market Cutoff:** The UK wholesale market contains multiple trading auctions and bilateral trading mechanisms (e.g., EPEX SPOT and Nord Pool day-ahead auctions at 11:00 / 12:00, or utility internal risk cutoffs such as 09:50). The MVP uses **09:50 Europe/London** as a documented, configurable default assumption. It is an analytical assumption, not a statutory single market rule.
2. **WINDFOR Temporal Resolution:** Elexon BMRS publishes `WINDFOR` forecasts at hourly intervals (settlement periods 1, 3, 5, 7, ...), whereas `FUELHH` actual outturns are reported for every half-hourly settlement period (1–48). Consequently, in strict matching without synthetic interpolation, the on-the-hour periods match (24 periods per day), while the half-hour periods correctly display `missing_forecast`. Per project specifications, missing periods are left `null` and never fabricated or zero-filled.

---

## 12. Prerequisites

- **Python:** Version 3.12 or higher.
- **Node.js:** Version 20 or 22 LTS with `npm`.
- **Docker & Docker Compose:** (Optional, for containerized execution).

---

## 13. Local Setup and Run Instructions

### 1. Clone Repository & Setup Environment
```bash
git clone <repo-url>
cd windiq
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be available at: `http://127.0.0.1:8000`  
Swagger API Docs available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
Open a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The WindIQ dashboard will be available at: `http://localhost:5173`

---

## 14. Environment Variable Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```dotenv
ELEXON_API_BASE_URL=https://data.elexon.co.uk/bmrs/api/v1
ELEXON_TIMEOUT_SECONDS=30.0
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
DEFAULT_CUTOFF_TIME=09:50
DEFAULT_TIMEZONE=Europe/London
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=100
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```dotenv
VITE_API_BASE_URL=/api
```
*(During development, Vite proxies `/api` requests directly to `http://127.0.0.1:8000`).*

---

## 15. Running the Test Suite

### Backend Test Suite (pytest)
Runs unit tests for forecast selection, metrics calculation, deduplication, and API routes:
```bash
cd backend
python -m pytest -v
```

### Frontend Test Suite (Vitest & Testing Library)
Runs unit tests for KPI rendering, null state preservation, error states, and user interactions:
```bash
cd frontend
npm test
```

### Frontend Production Build Test
Verifies TypeScript compilation and production bundle build:
```bash
cd frontend
npm run build
```

---

## 16. Docker Build and Run Instructions

WindIQ includes production-ready Dockerfiles for both services and a root `docker-compose.yml`:

```bash
# Build and run both backend and frontend containers
docker compose up --build
```

- **Frontend:** Accessible at `http://localhost:3000` (served via Nginx SPA with automatic `/api/` reverse proxy).
- **Backend API:** Accessible at `http://localhost:8000` (health check at `http://localhost:8000/api/health`).

To stop the containers:
```bash
docker compose down
```

---

## 17. Deployment Architecture

WindIQ is deployed across two independent cloud platforms:
- **Frontend:** Hosted on **Vercel** as a high-performance React 19 Single Page Application.
- **Backend API:** Hosted on **Heroku** as an ASGI FastAPI service connecting to Elexon BMRS.

```text
[ User Browser ]
       │
       ├─► [ Vercel ]  ──► React 19 Frontend (SPA)
       │
       └─► [ Heroku ]  ──► FastAPI Backend API (/api/analysis, /health)
                               │
                               └─► Elexon BMRS API v1
```

---

## 18. AI Tool Disclosure

- **AI Tool Used:** Google Antigravity AI Coding Assistant powered by Gemini models.
- **Areas of Assistance:** Architecture design, code implementation, API integration, testing, debugging, and UI development.
- **Human Oversight:** AI-assisted outputs were reviewed and validated during development. Data handling, forecast-vintage selection, and metric calculations were tested to ensure consistency with the project requirements.

---

## 19. Analytics and Procurement Boundaries Disclaimer

WindIQ is strictly an **analytical forecast decision-support and accuracy tool**. 

It does **not**:
- Calculate a definitive additional amount of electricity to purchase or sell.
- Incorporate power portfolio contract volumes, demand profiles, or transmission losses.
- Generate automated orders, trading instructions, or price forecasts.
- Substitute third-party or synthetic data for missing settlement periods.

Wind generation error alone cannot determine procurement action without reference to systemic imbalance prices, demand fluctuations, and asset commitments.
