"""Billing + plan limit tests."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.core import db
from app.core.config import settings
from app.main import app


@pytest.fixture(autouse=True)
async def temp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", str(tmp_path))
    await db.init_db()
    yield


@pytest.mark.asyncio
async def test_plans_endpoint_is_public():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/billing/plans")
        assert r.status_code == 200
        body = r.json()
        ids = {p["id"] for p in body["plans"]}
        assert ids == {"free", "pro", "lab", "enterprise"}
        # Pro/Lab/Enterprise should be coming-soon
        for p in body["plans"]:
            if p["id"] == "free":
                assert p["available"] is True
            else:
                assert p["available"] is False


@pytest.mark.asyncio
async def test_models_endpoint_is_public():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/models")
        assert r.status_code == 200
        body = r.json()
        assert len(body["models"]) == 3  # haiku, sonnet, opus
        assert all("input_usd_per_m" in m for m in body["models"])


@pytest.mark.asyncio
async def test_usage_requires_auth_and_defaults_to_free():
    from app.core.auth import create_user, create_access_token

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 401 without token
        r = await client.get("/api/billing/usage")
        assert r.status_code == 401

        user = await create_user("alice@example.com", "password123")
        token = create_access_token(user.id)

        r = await client.get("/api/billing/usage", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert body["plan"]["id"] == "free"
        assert body["tokens_used"] == 0
        assert body["generations_used"] == 0
        assert body["tokens_limit"] > 0


@pytest.mark.asyncio
async def test_plan_gate_blocks_when_over_token_limit():
    """If the user's tokens_used >= plan's tokens_per_month, /analyze returns 402."""
    from app.core.auth import create_user, create_access_token
    from app.services import plan_store
    from app.core.plans import get_plan

    user = await create_user("heavy@example.com", "password123")
    free = get_plan("free")
    # Push usage above the limit
    await plan_store.record_usage(user.id, tokens=free.tokens_per_month + 1, generations=0)

    token = create_access_token(user.id)
    payload = {
        "property": {
            "address": "12 Test St", "suburb": "Parramatta", "state": "NSW",
            "postcode": "2150", "property_type": "house",
            "bedrooms": 3, "bathrooms": 2, "car_spaces": 1,
            "purchase_price": 800000, "estimated_rent_per_week": 700,
            "loan_amount": None, "interest_rate": 6.5, "loan_term_years": 30,
            "is_new_build": False, "year_built": None,
        }
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/property/analyze",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 402
        assert r.json()["detail"]["type"] == "plan_limit_tokens"
