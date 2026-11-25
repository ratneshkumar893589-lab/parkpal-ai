# Architecture decisions

## Runtime boundaries
- `frontend/`: Next.js UI, browser-side map and API client.
- `backend/`: FastAPI HTTP API and domain logic.
- `database/`: PostgreSQL schema baseline.
- `ai_engine/`: reserved for separately versioned model training and evaluation as the project grows.

## Demo versus production
The initial API uses seeded in-memory parking data to make the demo easy to run. A local SQLAlchemy database configuration and PostgreSQL schema are included as the persistence foundation, but the demo endpoints are not yet wired to persisted inventory. Never describe seeded values as live availability.

## Recommendation
A transparent weighted score combines predicted availability (35%), walking distance (20%), budget match (15%), rating (10%), vehicle fit (10%) and EV preference (10%). These are initial heuristic weights, not learned coefficients. Later evaluate content-based and collaborative-filtering models against real user interactions.

## Prediction
The current endpoint uses a deterministic heuristic so the UI can demonstrate arrival-time reasoning. A validated model needs timestamped occupancy, capacity, entry/exit events, calendar and traffic features, train/test splits by time, calibration and monitoring.

## Reservations
The demo requires an explicit `confirm: true` field and decrements a sample in-memory count. This is not safe for concurrent real-world inventory. Production must use database transactions, row-level locking or an atomic capacity update, a unique idempotency key, authenticated user identity and time-window overlap constraints.
