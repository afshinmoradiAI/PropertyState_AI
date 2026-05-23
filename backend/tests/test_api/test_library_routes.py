"""Tests for the library routes — full read/list/delete cycle against real SQLite."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.core import db
from app.core.config import settings
from app.main import app
from app.schemas.property import PropertyReport
from app.services import report_store

# Reuse the mock report from the property routes test
from tests.test_api.test_property_routes import MOCK_REPORT


@pytest.fixture(autouse=True)
async def temp_db(tmp_path, monkeypatch):
    """Point the DB at a fresh temp file for every test."""
    monkeypatch.setattr(settings, "data_dir", str(tmp_path))
    await db.init_db()
    yield


@pytest.mark.asyncio
async def test_save_and_get_report():
    report_id = await report_store.save_report(MOCK_REPORT)
    assert report_id and len(report_id) == 32

    fetched = await report_store.get_report(report_id)
    assert fetched is not None
    assert isinstance(fetched, PropertyReport)
    assert fetched.investment_potential.verdict == "BUY"
    assert fetched.property.address == MOCK_REPORT.property.address


@pytest.mark.asyncio
async def test_library_list_and_detail_routes():
    # Seed: one report owned by alice, one anonymous
    from app.core.auth import create_user, create_access_token
    alice = await create_user("alice@example.com", "password123")
    id_alice = await report_store.save_report(MOCK_REPORT, user_id=alice.id)
    id_anon = await report_store.save_report(MOCK_REPORT)

    token = create_access_token(alice.id)
    auth = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Alice's library — only her report
        r = await client.get("/api/library", headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["reports"][0]["id"] == id_alice

        # Library requires auth
        r = await client.get("/api/library")
        assert r.status_code == 401

        # Public detail endpoint — anyone can fetch by id
        r = await client.get(f"/api/library/{id_alice}")
        assert r.status_code == 200
        r = await client.get(f"/api/library/{id_anon}")
        assert r.status_code == 200

        # 404 for unknown id
        r = await client.get("/api/library/does-not-exist")
        assert r.status_code == 404


@pytest.mark.asyncio
async def test_library_delete_only_by_owner():
    from app.core.auth import create_user, create_access_token
    alice = await create_user("alice@example.com", "password123")
    bob = await create_user("bob@example.com", "password123")

    alice_report = await report_store.save_report(MOCK_REPORT, user_id=alice.id)

    alice_auth = {"Authorization": f"Bearer {create_access_token(alice.id)}"}
    bob_auth = {"Authorization": f"Bearer {create_access_token(bob.id)}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Bob cannot delete Alice's report → 404 (not exposing existence)
        r = await client.delete(f"/api/library/{alice_report}", headers=bob_auth)
        assert r.status_code == 404

        # Alice can
        r = await client.delete(f"/api/library/{alice_report}", headers=alice_auth)
        assert r.status_code == 204

        # Gone for everyone
        r = await client.get(f"/api/library/{alice_report}")
        assert r.status_code == 404
