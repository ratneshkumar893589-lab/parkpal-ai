# ParkPal AI

AI-powered smart parking discovery, recommendation and prediction demo.

## What is included

- Next.js + TypeScript + Tailwind frontend
- FastAPI backend with sample parking data
- Hybrid explainable parking recommendation scoring
- Arrival-time availability prediction (clearly labelled simulated demo data)
- Reservation creation with a final confirmation step
- Multilingual assistant endpoint (English/Hindi/Kannada demo responses)
- OpenStreetMap + Leaflet map
- SQL schema for PostgreSQL/Supabase
- SQLite local demo database; set `DATABASE_URL` to PostgreSQL when ready

> This is a runnable MVP foundation, not a production-certified parking network. Parking availability, traffic and predictions in demo mode are simulated. No physical sensors, camera feeds, payment processing or live traffic provider are connected.

## Requirements

- Node.js 20.9+
- npm
- Python 3.11+

## 1. Start the backend

Open a terminal in `backend/`:

### Windows PowerShell
```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### macOS/Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## 2. Start the frontend

Open another terminal in `frontend/`:

```bash
npm install
npm run dev
```

Open http://localhost:3000

The frontend expects the API at `http://localhost:8000`. Override with `NEXT_PUBLIC_API_URL`.

## 3. PostgreSQL / Supabase

The local demo uses SQLite so it can run without cloud credentials. The backend accepts a SQLAlchemy `DATABASE_URL`, for example:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres
```

Create `backend/.env` from `backend/.env.example` before using hosted credentials. Never commit `.env`.

The normalized PostgreSQL starter schema is in `database/schema.sql`. For a real deployment, configure Supabase Auth/RLS, migrations, backups and production secrets before opening the service publicly.

## 4. Demo behaviour

- Search parking by destination, budget, vehicle and arrival minutes.
- Recommendations are ranked using availability, distance, price, preferences and rating.
- The prediction endpoint returns a simulated forecast and confidence label.
- Clicking Reserve opens a confirmation step. Only confirming sends the reservation request.
- The assistant supports basic intent parsing and sample responses in English, Hindi and Kannada.
- Map tiles come from OpenStreetMap; internet access is needed to load them.

## Important production work still required

1. Replace sample parking locations and generated occupancy with verified operator/sensor feeds.
2. Train and validate a prediction model on real historical occupancy/entry/exit data.
3. Add real identity verification and role-based authorization (Supabase Auth/JWT).
4. Add transactional slot inventory and idempotency for concurrent reservations.
5. Integrate a compliant payment provider; the current demo does not charge money.
6. Add routing/traffic provider and validate its terms and API limits.
7. Add rate limiting, monitoring, privacy policy, security review and automated deployment.
8. Add owner/admin workflows and comprehensive test coverage before production launch.

## Project layout

```text
parkpal-ai/
├── frontend/       Next.js app
├── backend/        FastAPI API and demo logic
├── database/       PostgreSQL schema
└── docs/           Architecture notes
```
