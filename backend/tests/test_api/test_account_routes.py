"""Account management tests — data export and deletion."""
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
async def test_data_export_includes_reports():
    from app.core.auth import create_user, create_access_token
    from app.services import report_store
    from tests.test_api.test_property_routes import MOCK_REPORT

    user = await create_user("alice@example.com", "password123")
    await report_store.save_report(MOCK_REPORT, user_id=user.id)
    token = create_access_token(user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/account/export", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["email"] == "alice@example.com"
        assert len(body["reports"]) == 1
        assert "exported_at" in body


@pytest.mark.asyncio
async def test_account_delete_cascades_to_reports():
    from app.core.auth import create_user, create_access_token, get_user_by_id
    from app.services import report_store

    user = await create_user("bob@example.com", "password123")
    token = create_access_token(user.id)
    await report_store.save_report(
        __import__("tests.test_api.test_property_routes", fromlist=["MOCK_REPORT"]).MOCK_REPORT,
        user_id=user.id,
    )
    assert await report_store.count_reports(user_id=user.id) == 1

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.delete("/api/account/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200

    # User gone
    assert await get_user_by_id(user.id) is None
    # Reports cascaded
    assert await report_store.count_reports(user_id=user.id) == 0
