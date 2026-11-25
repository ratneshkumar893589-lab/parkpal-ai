-- PostgreSQL starter schema for ParkPal AI.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('driver','owner','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parking_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected'))
);

CREATE TABLE parking_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES parking_owners(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  vehicle_types TEXT[] NOT NULL DEFAULT ARRAY['car'],
  ev_charging BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parking_location_geo_idx ON parking_locations(latitude, longitude);
CREATE INDEX parking_location_status_idx ON parking_locations(status);

CREATE TABLE parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
  slot_code TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(parking_location_id, slot_code)
);

CREATE TABLE parking_availability (
  id BIGSERIAL PRIMARY KEY,
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occupied_slots INTEGER NOT NULL CHECK (occupied_slots >= 0),
  available_slots INTEGER NOT NULL CHECK (available_slots >= 0),
  source TEXT NOT NULL DEFAULT 'simulated',
  CHECK (occupied_slots + available_slots >= 0)
);
CREATE INDEX parking_availability_time_idx ON parking_availability(parking_location_id, observed_at DESC);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX reservations_location_time_idx ON reservations(parking_location_id, start_at, end_at);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  provider TEXT NOT NULL DEFAULT 'demo',
  provider_reference TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_charged'
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_vehicle TEXT DEFAULT 'car',
  max_hourly_rate NUMERIC(10,2),
  prefer_ev BOOLEAN NOT NULL DEFAULT false,
  max_walking_distance_m INTEGER
);

CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  destination TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE favourite_locations (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, parking_location_id)
);

CREATE TABLE prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_location_id UUID NOT NULL REFERENCES parking_locations(id),
  predicted_for TIMESTAMPTZ NOT NULL,
  predicted_available INTEGER NOT NULL,
  availability_probability NUMERIC(5,4) NOT NULL,
  model_version TEXT NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'simulated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  parking_location_id UUID REFERENCES parking_locations(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
