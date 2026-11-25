from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4
import os
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.db import supabase

def load_parking_from_supabase():
    """Fetch parking locations from Supabase and map them to the API format."""

    try:
        response = (
            supabase
            .table("parking_locations")
            .select("*")
            .execute()
        )

        parking_records = []

        for row in response.data:
            parking_records.append({
                "id": str(row["id"]),
                "name": row["name"],
                "address": row["address"],
                "lat": row["latitude"],
                "lng": row["longitude"],
                "capacity": row["capacity"],
                "available": row["available"],
                "hourly_rate": row["hourly_rate"],
                "rating": row["rating"],
                "security": row["security"],
                "ev_charging": row["ev_charging"],
                "vehicle_types": row["vehicle_types"],
                "walking_m": row["walking_m"],
                "kind": row["kind"],
                "source": row.get("data_source", "SUPABASE DATABASE"),
            })

        return parking_records

    except Exception as error:
        print("Supabase parking data error:", error)
        raise HTTPException(
            status_code=503,
            detail="Unable to retrieve parking locations from the database."
        )

app = FastAPI(
    title="ParkPal AI API",
    description="Smart parking discovery, simulated prediction and demo reservations.",
    version="0.1.0",
)

origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demonstration records only. Replace with verified operator inventory in production.
PARKING = [
    {
        "id": "pp-001", "name": "Central Mall Parking", "address": "Whitefield Main Road, Bengaluru",
        "lat": 12.9698, "lng": 77.7500, "capacity": 80, "available": 22,
        "hourly_rate": 40, "rating": 4.4, "security": "CCTV (demo listing)",
        "ev_charging": True, "vehicle_types": ["car", "bike"], "walking_m": 350,
        "kind": "Commercial", "source": "SIMULATED DEMO DATA",
    },
    {
        "id": "pp-002", "name": "Tech Park Visitor Parking", "address": "ITPL Road, Whitefield, Bengaluru",
        "lat": 12.9862, "lng": 77.7370, "capacity": 120, "available": 48,
        "hourly_rate": 30, "rating": 4.2, "security": "Guarded entry (demo listing)",
        "ev_charging": False, "vehicle_types": ["car", "bike"], "walking_m": 650,
        "kind": "Commercial", "source": "SIMULATED DEMO DATA",
    },
    {
        "id": "pp-003", "name": "Hope Farm Public Parking", "address": "Hope Farm Junction, Bengaluru",
        "lat": 12.9895, "lng": 77.7610, "capacity": 45, "available": 8,
        "hourly_rate": 20, "rating": 3.9, "security": "Open public area (demo listing)",
        "ev_charging": False, "vehicle_types": ["car", "bike"], "walking_m": 900,
        "kind": "Public", "source": "SIMULATED DEMO DATA",
    },
    {
        "id": "pp-004", "name": "Brookfield Community Lot", "address": "Brookfield, Bengaluru",
        "lat": 12.9682, "lng": 77.7150, "capacity": 60, "available": 31,
        "hourly_rate": 25, "rating": 4.1, "security": "Lighting and attendant (demo listing)",
        "ev_charging": True, "vehicle_types": ["car"], "walking_m": 500,
        "kind": "Community", "source": "SIMULATED DEMO DATA",
    },
]

RESERVATIONS = []

class SearchRequest(BaseModel):
    destination: str = "Whitefield, Bengaluru"
    arrival_minutes: int = Field(default=20, ge=0, le=240)
    duration_hours: int = Field(default=2, ge=1, le=24)
    max_hourly_rate: Optional[float] = Field(default=None, ge=0)
    vehicle_type: str = "car"
    prefer_ev: bool = False

class ReservationRequest(BaseModel):
    parking_id: str
    customer_name: str = Field(min_length=2, max_length=80)
    vehicle_number: str = Field(min_length=4, max_length=20)
    duration_hours: int = Field(default=2, ge=1, le=24)
    confirm: bool = False

class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: str = "en"

def haversine_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, asin, sqrt
    dlat, dlon = radians(lat2-lat1), radians(lon2-lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return 6371 * 2 * asin(sqrt(a))

def predict_availability(lot, arrival_minutes):
    # Transparent heuristic demo forecast, not a trained/live model.
    seed = sum(ord(c) for c in lot["id"]) + arrival_minutes
    rng = random.Random(seed)
    expected_departures = max(0, int(arrival_minutes / 25 * lot["capacity"] * 0.006))
    expected_arrivals = max(0, int(arrival_minutes / 25 * lot["capacity"] * 0.012))
    predicted = max(0, min(lot["capacity"], lot["available"] + expected_departures - expected_arrivals))
    probability = max(0.03, min(0.98, (predicted + 1) / max(1, lot["capacity"]) * 1.55))
    confidence = "Low — simulated data"
    return {
        "predicted_available": predicted,
        "availability_probability": round(probability, 2),
        "confidence": confidence,
        "expected_wait_minutes": 0 if predicted > 0 else rng.randint(5, 18),
        "label": "SIMULATED PREDICTION",
    }

def recommend(lot, request):
    forecast = predict_availability(lot, request.arrival_minutes)
    distance = lot["walking_m"]
    price_score = 1.0 if not request.max_hourly_rate else min(1, request.max_hourly_rate / max(lot["hourly_rate"], 1))
    availability_score = forecast["availability_probability"]
    distance_score = max(0, 1 - distance / 2000)
    rating_score = lot["rating"] / 5
    vehicle_score = 1 if request.vehicle_type in lot["vehicle_types"] else 0
    ev_score = 1 if (not request.prefer_ev or lot["ev_charging"]) else 0
    score = 100 * (
        0.35 * availability_score + 0.20 * distance_score + 0.15 * price_score
        + 0.10 * rating_score + 0.10 * vehicle_score + 0.10 * ev_score
    )
    reasons = []
    if forecast["predicted_available"] > 0: reasons.append("Predicted spaces available at arrival")
    if distance <= 500: reasons.append("Short walk to destination")
    if request.max_hourly_rate and lot["hourly_rate"] <= request.max_hourly_rate: reasons.append("Within your hourly budget")
    if request.prefer_ev and lot["ev_charging"]: reasons.append("EV charging listed")
    if not reasons: reasons.append("Balanced match for your search")
    return {**lot, "distance_km": round(haversine_km(12.9716, 77.7500, lot["lat"], lot["lng"]), 2),
            "estimated_drive_minutes": max(3, int(lot["walking_m"] / 110) + 4),
            "total_estimated_cost": lot["hourly_rate"] * request.duration_hours,
            "recommendation_score": round(score, 1), "reasons": reasons, "prediction": forecast}

@app.get("/health")
def health():
    return {"status": "ok", "service": "ParkPal AI API", "mode": "demo"}

@app.get("/api/parking")
def list_parking():
    parking_records = load_parking_from_supabase()

    return {
        "items": parking_records,
        "data_mode": "SUPABASE DATABASE"
    }

@app.post("/api/recommendations")
def get_recommendations(request: SearchRequest):
    results = []
    for lot in load_parking_from_supabase():
        if request.max_hourly_rate is not None and lot["hourly_rate"] > request.max_hourly_rate:
            continue
        if request.vehicle_type not in lot["vehicle_types"]:
            continue
        results.append(recommend(lot, request))
    results.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return {
    "items": results,
    "data_mode": "SUPABASE DATABASE",
    "note": "Parking records are retrieved from Supabase. Scores and arrival forecasts remain demonstration heuristics."
}

@app.get("/api/parking/{parking_id}")
def parking_detail(parking_id: str):
    parking_records = load_parking_from_supabase()

    lot = next(
        (p for p in parking_records if p["id"] == parking_id),
        None
    )

    if not lot:
        raise HTTPException(404, "Parking location not found")

    return {
        **lot,
        "prediction": predict_availability(lot, 20)
    }

@app.get("/api/predictions/{parking_id}")
def prediction_series(parking_id: str):
    parking_records = load_parking_from_supabase()

    lot = next(
        (p for p in parking_records if p["id"] == parking_id),
        None
    )

    if not lot:
        raise HTTPException(404, "Parking location not found")

    return {
        "parking_id": parking_id,
        "label": "SIMULATED PREDICTION",
        "forecast": [
            {
                "minutes_ahead": m,
                **predict_availability(lot, m)
            }
            for m in [0, 10, 20, 30, 45, 60]
        ]
    }


@app.post("/api/reservations")
def create_reservation(request: ReservationRequest):

    if not request.confirm:
        raise HTTPException(
            400,
            "Explicit confirmation is required before creating a reservation."
        )

    # Retrieve parking locations from Supabase
    parking_records = load_parking_from_supabase()

    lot = next(
        (p for p in parking_records if p["id"] == request.parking_id),
        None
    )

    if not lot:
        raise HTTPException(404, "Parking location not found")

    if lot["available"] < 1:
        raise HTTPException(409, "No parking spaces currently available")

    # Generate a unique booking reference
    booking_reference = "PP-" + uuid4().hex[:8].upper()

    # Prepare reservation for Supabase
    booking_data = {
        "booking_reference": booking_reference,
        "parking_id": lot["id"],
        "customer_name": request.customer_name,
        "vehicle_number": request.vehicle_number.upper(),
        "duration_hours": request.duration_hours,
        "estimated_total": lot["hourly_rate"] * request.duration_hours,
        "status": "CONFIRMED (DEMO)",
        "payment_status": "NOT CHARGED — DEMO"
    }

    try:
        response = (
            supabase
            .table("reservations")
            .insert(booking_data)
            .select("*")
            .execute()
        )

        if not response.data:
            raise HTTPException(
                500,
                "Reservation could not be saved."
            )

        saved_booking = response.data[0]

        return {
            "booking_id": saved_booking["booking_reference"],
            "parking_id": saved_booking["parking_id"],
            "parking_name": lot["name"],
            "customer_name": saved_booking["customer_name"],
            "vehicle_number": saved_booking["vehicle_number"],
            "duration_hours": saved_booking["duration_hours"],
            "estimated_total": saved_booking["estimated_total"],
            "status": saved_booking["status"],
            "payment_status": saved_booking["payment_status"],
            "created_at": saved_booking["created_at"]
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Reservation database error:", error)
        raise HTTPException(
            503,
            "Unable to save reservation to the database."
        )


@app.get("/api/reservations")
def reservations():
    try:
        response = (
            supabase
            .table("reservations")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "items": response.data,
            "data_mode": "SUPABASE DATABASE",
            "count": len(response.data)
        }

    except Exception as error:
        print("Reservation history database error:", error)
        raise HTTPException(
            status_code=503,
            detail="Unable to retrieve reservation history."
        )



@app.post("/api/assistant")
def assistant(request: AssistantRequest):
    msg = request.message.lower().strip()
    lang = request.language.lower()

    # Language greeting
    if lang in ("hi", "hindi"):
        intro = "नमस्ते! मैं ParkPal Assistant हूँ। यह डेमो पार्किंग डेटा है।"
    elif lang in ("kn", "kannada"):
        intro = "ನಮಸ್ಕಾರ! ನಾನು ParkPal Assistant. ಇದು ಡೆಮೊ ಪಾರ್ಕಿಂಗ್ ಡೇಟಾ."
    else:
        intro = "Hi! I'm ParkPal Assistant. I'm using clearly labelled demo parking data."

    # Start with all parking locations
    matches = PARKING.copy()

    # 1. EV charging filter
    wants_ev = any(word in msg for word in [
        "ev", "electric vehicle", "charging", "charger"
    ])

    if wants_ev:
        matches = [p for p in matches if p["ev_charging"]]

    # 2. Security / CCTV filter
    wants_cctv = 'cctv' in msg

    wants_security = any(word in msg for word in [
        "security", "secure", "safe", "cctv", "guard", "attendant"
    ])

    if wants_cctv:
        #Only locations explicitly listing CCTV
        matches = [
            p for p in matches
            if "cctv" in p["security"].lower()
        ]

    elif wants_security:
        matches = [
            p for p in matches
            if any(word in p["security"].lower()
                   for word in ["cctv", "guard", "attendant"])
        ]

    # 3. Cheapest parking intent
    wants_cheapest = any(word in msg for word in [
        "cheap", "cheapest", "affordable", "lowest price", "low cost"
    ])

    # 4. Availability intent
    wants_availability = any(word in msg for word in [
        "available", "availability", "free space",
        "empty space", "slots", "vacancy"
    ])

    # 5. Nearby / walking distance intent
    wants_near = any(word in msg for word in [
        "near", "nearby", "closest", "nearest", "walking distance"
    ])

    # 6. Optional hourly budget extraction
    import re

    budget_match = re.search(
        r"(?:₹|rs\.?\s*)\s*(\d+(?:\.\d+)?)",
        msg
    )

    if budget_match:
        budget = float(budget_match.group(1))
        matches = [
            p for p in matches
            if p["hourly_rate"] <= budget
        ]

    # Sort according to the user's intent
    if wants_cheapest:
        matches.sort(key=lambda p: p["hourly_rate"])

    elif wants_availability:
        matches.sort(key=lambda p: p["available"], reverse=True)

    elif wants_near:
        matches.sort(key=lambda p: p["walking_m"])

    else:
        matches.sort(key=lambda p: p["hourly_rate"])

    # No matching parking locations
    if not matches:
        return {
            "reply": (
                intro + " Sorry, no demo parking location matches "
                "all your requested conditions. Try changing your "
                "budget or parking preferences."
            ),
            "suggestions": [],
            "data_mode": "SIMULATED"
        }

    # Generate an answer based on the detected intent
    if wants_ev and wants_cheapest:
        answer = "Here are the most affordable parking locations with EV charging."

    elif wants_ev:
        answer = "These parking locations have EV charging listed."

    elif wants_cctv:
        answer = "These parking locations have CCTV listed."

    elif wants_security:
        answer = "These parking locations list CCTV, guards or attendants."

    elif wants_availability:
        answer = "Here are the parking locations ranked by currently listed available spaces."

    elif wants_near:
        answer = "Here are the parking locations ranked by walking distance."

    elif wants_cheapest:
        answer = "Here are the most affordable parking options."

    elif budget_match:
        answer = f"Here are the parking locations within your ₹{budget:g}/hour budget."

    else:
        answer = "Here are the available demo parking options."

    # Prepare recommendations for the frontend
    suggestions = []

    for p in matches[:4]:
        suggestions.append({
            "id": p["id"],
            "name": p["name"],
            "rate": p["hourly_rate"],
            "available": p["available"],
            "ev_charging": p["ev_charging"],
            "security": p["security"],
            "walking_m": p["walking_m"]
        })

    # Add a useful summary of the best match
    best = matches[0]

    summary = (
        f" Best match: {best['name']}, "
        f"₹{best['hourly_rate']}/hour, "
        f"{best['available']} listed spaces available."
    )

    if best["ev_charging"]:
        summary += " EV charging is listed."

    return {
        "reply": intro + " " + answer + summary,
        "suggestions": suggestions,
        "data_mode": "SIMULATED"
    }
