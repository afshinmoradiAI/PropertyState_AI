"""Auth flow tests — register, login, me, refresh, duplicate, wrong password."""
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
async def test_register_login_me_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register
        r = await client.post(
            "/api/auth/register",
            json={"email": "alice@example.com", "password": "supersecret"},
        )
        assert r.status_code == 201
        token = r.json()["access_token"]
        assert token

        auth = {"Authorization": f"Bearer {token}"}

        # /me works with token
        r = await client.get("/api/auth/me", headers=auth)
        assert r.status_code == 200
        assert r.json()["email"] == "alice@example.com"

        # /me 401 without token
        r = await client.get("/api/auth/me")
        assert r.status_code == 401

        # Login with right password
        r = await client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "supersecret"},
        )
        assert r.status_code == 200
        assert r.json()["access_token"]

        # Login with wrong password
        r = await client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "WRONGGGGGG"},
        )
        assert r.status_code == 401

        # Login with unknown email
        r = await client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "supersecret"},
        )
        assert r.status_code == 401

        # Refresh token
        r = await client.post("/api/auth/refresh", headers=auth)
        assert r.status_code == 200
        assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_register_duplicate_email():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.post(
            "/api/auth/register",
            json={"email": "dup@example.com", "password": "password123"},
        )
        assert r1.status_code == 201

        r2 = await client.post(
            "/api/auth/register",
            json={"email": "dup@example.com", "password": "password123"},
        )
        assert r2.status_code == 409
        assert r2.json()["detail"]["type"] == "email_taken"


@pytest.mark.asyncio
async def test_register_validates_password_length():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/auth/register",
            json={"email": "weak@example.com", "password": "short"},  # < 8 chars
        )
        assert r.status_code == 422
