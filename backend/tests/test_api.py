from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/health").status_code == 200

def test_recommendations_are_labelled_demo():
    response = client.post("/api/recommendations", json={"destination": "Whitefield", "arrival_minutes": 20})
    assert response.status_code == 200
    assert response.json()["data_mode"] == "SIMULATED DEMO DATA"

def test_reservation_requires_confirmation():
    response = client.post("/api/reservations", json={
        "parking_id": "pp-001", "customer_name": "Demo User",
        "vehicle_number": "KA01AB1234", "duration_hours": 1, "confirm": False
    })
    assert response.status_code == 400
