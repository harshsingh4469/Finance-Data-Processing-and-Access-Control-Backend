"""
Finance Data Processing and Access Control Backend - Comprehensive API Tests
Tests: Auth, Records, Dashboard, Users endpoints with RBAC
"""
import pytest
import requests
import os

BASE_URL = "https://findata-core.preview.emergentagent.com"

# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@findata.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def analyst_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "analyst@findata.com", "password": "analyst123"})
    assert r.status_code == 200, f"Analyst login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def viewer_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "viewer@findata.com", "password": "viewer123"})
    assert r.status_code == 200, f"Viewer login failed: {r.text}"
    return r.json()["token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Health & Docs ────────────────────────────────────────────────────────────

class TestHealthAndDocs:
    """Health check and Swagger docs"""

    def test_health_check(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data or "ok" in str(data).lower()
        print(f"PASS: health check - {data}")

    def test_swagger_json(self):
        r = requests.get(f"{BASE_URL}/api/docs.json")
        assert r.status_code == 200
        data = r.json()
        assert "openapi" in data or "swagger" in data
        print(f"PASS: swagger JSON - openapi version: {data.get('openapi', data.get('swagger'))}")

    def test_swagger_ui(self):
        r = requests.get(f"{BASE_URL}/api/docs/")
        assert r.status_code == 200
        assert "swagger" in r.text.lower() or "html" in r.headers.get("content-type","").lower()
        print("PASS: swagger UI accessible")


# ─── Auth ─────────────────────────────────────────────────────────────────────

class TestAuth:
    """Authentication endpoints"""

    def test_login_admin_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@findata.com", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: admin login")

    def test_login_analyst_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "analyst@findata.com", "password": "analyst123"})
        assert r.status_code == 200
        assert "token" in r.json()
        print("PASS: analyst login")

    def test_login_viewer_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "viewer@findata.com", "password": "viewer123"})
        assert r.status_code == 200
        assert "token" in r.json()
        print("PASS: viewer login")

    def test_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@findata.com", "password": "wrongpassword"})
        assert r.status_code == 401
        print("PASS: invalid credentials returns 401")

    def test_login_missing_fields(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@findata.com"})
        assert r.status_code == 400
        print("PASS: missing password returns 400")

    def test_register_new_user(self):
        import time
        ts = int(time.time())
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": f"testuser_{ts}@example.com",
            "password": "password123",
            "role": "viewer"
        })
        assert r.status_code == 201
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == "viewer"
        print("PASS: register new user")

    def test_register_duplicate_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dup", "email": "admin@findata.com", "password": "password123"
        })
        assert r.status_code == 400
        print("PASS: duplicate email returns 400")

    def test_register_missing_fields(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": "x@x.com"})
        assert r.status_code == 400
        print("PASS: register missing fields returns 400")

    def test_get_me(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "admin@findata.com"
        print("PASS: GET /api/auth/me")

    def test_no_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        print("PASS: no auth returns 401")

    def test_invalid_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert r.status_code == 401
        print("PASS: invalid token returns 401")


# ─── Records ──────────────────────────────────────────────────────────────────

class TestRecords:
    """Financial records CRUD with RBAC"""

    def test_list_records_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records", headers=auth_headers(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert "data" in data and "pagination" in data
        print(f"PASS: list records as admin")

    def test_list_records_analyst(self, analyst_token):
        r = requests.get(f"{BASE_URL}/api/records", headers=auth_headers(analyst_token))
        assert r.status_code == 200
        print("PASS: list records as analyst")

    def test_list_records_viewer(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/records", headers=auth_headers(viewer_token))
        assert r.status_code == 200
        print("PASS: list records as viewer")

    def test_list_records_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/records")
        assert r.status_code == 401
        print("PASS: list records no auth returns 401")

    def test_filter_by_type(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records?type=income", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: filter records by type=income")

    def test_filter_by_category(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records?category=Salary", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: filter records by category")

    def test_filter_by_date_range(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records?startDate=2025-01-01&endDate=2026-12-31", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: filter records by date range")

    def test_filter_by_search(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records?search=salary", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: search records")

    def test_pagination(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/records?page=1&limit=5", headers=auth_headers(admin_token))
        assert r.status_code == 200
        data = r.json()
        records = data.get("records", data) if isinstance(data, dict) else data
        assert len(records) <= 5
        print("PASS: pagination page=1&limit=5")

    def test_create_record_admin(self, admin_token):
        payload = {
            "title": "TEST_Salary Income",
            "amount": 5000,
            "type": "income",
            "category": "Salary",
            "date": "2025-06-01",
            "description": "Test record"
        }
        r = requests.post(f"{BASE_URL}/api/records", json=payload, headers=auth_headers(admin_token))
        assert r.status_code == 201, f"Create record failed: {r.text}"
        data = r.json()
        assert "_id" in data or "id" in data
        print("PASS: create record as admin")
        return (data.get("record") or data).get("_id") or (data.get("record") or data).get("id")

    def test_create_record_viewer_forbidden(self, viewer_token):
        payload = {"title": "TEST_Viewer Record", "amount": 100, "type": "expense", "category": "Other", "date": "2025-06-01"}
        r = requests.post(f"{BASE_URL}/api/records", json=payload, headers=auth_headers(viewer_token))
        assert r.status_code == 403
        print("PASS: create record as viewer returns 403")

    def test_create_record_missing_fields(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/records", json={"title": "No amount"}, headers=auth_headers(admin_token))
        assert r.status_code == 400
        print("PASS: create record missing fields returns 400")

    def test_update_record_admin(self, admin_token):
        # First create a record
        payload = {"title": "TEST_Update Record", "amount": 1000, "type": "income", "category": "Salary", "date": "2025-06-01"}
        create_r = requests.post(f"{BASE_URL}/api/records", json=payload, headers=auth_headers(admin_token))
        assert create_r.status_code == 201
        record = create_r.json()
        record_data = record.get("record") or record
        record_id = record_data.get("_id") or record_data.get("id")

        # Update
        r = requests.put(f"{BASE_URL}/api/records/{record_id}", json={"amount": 2000}, headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: update record as admin")

    def test_delete_record_admin(self, admin_token):
        # Create then delete
        payload = {"title": "TEST_Delete Record", "amount": 500, "type": "expense", "category": "Other", "date": "2025-06-01"}
        create_r = requests.post(f"{BASE_URL}/api/records", json=payload, headers=auth_headers(admin_token))
        assert create_r.status_code == 201
        record = create_r.json()
        record_data = record.get("record") or record
        record_id = record_data.get("_id") or record_data.get("id")

        r = requests.delete(f"{BASE_URL}/api/records/{record_id}", headers=auth_headers(admin_token))
        assert r.status_code in [200, 204]
        print("PASS: soft delete record as admin")

    def test_soft_delete_record_not_in_list(self, admin_token):
        # Create then delete, verify not in list
        payload = {"title": "TEST_SoftDelete", "amount": 300, "type": "expense", "category": "Other", "date": "2025-06-01"}
        create_r = requests.post(f"{BASE_URL}/api/records", json=payload, headers=auth_headers(admin_token))
        record_data = (create_r.json().get("record") or create_r.json())
        record_id = record_data.get("_id") or record_data.get("id")

        requests.delete(f"{BASE_URL}/api/records/{record_id}", headers=auth_headers(admin_token))

        # Verify deleted record doesn't appear in list
        list_r = requests.get(f"{BASE_URL}/api/records", headers=auth_headers(admin_token))
        records = list_r.json().get("data", [])
        ids = [str(rec.get("_id") or rec.get("id")) for rec in records]
        assert record_id not in ids
        print("PASS: soft deleted record not in list")


# ─── Dashboard ────────────────────────────────────────────────────────────────

class TestDashboard:
    """Dashboard endpoints with role-based access"""

    def test_summary_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: dashboard/summary admin")

    def test_summary_viewer(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers(viewer_token))
        assert r.status_code == 200
        print("PASS: dashboard/summary viewer")

    def test_recent_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/recent", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: dashboard/recent admin")

    def test_recent_viewer(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/recent", headers=auth_headers(viewer_token))
        assert r.status_code == 200
        print("PASS: dashboard/recent viewer")

    def test_categories_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/categories", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: dashboard/categories admin")

    def test_categories_analyst(self, analyst_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/categories", headers=auth_headers(analyst_token))
        assert r.status_code == 200
        print("PASS: dashboard/categories analyst")

    def test_categories_viewer_forbidden(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/categories", headers=auth_headers(viewer_token))
        assert r.status_code == 403
        print("PASS: dashboard/categories viewer returns 403")

    def test_trends_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: dashboard/trends admin")

    def test_trends_analyst(self, analyst_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=auth_headers(analyst_token))
        assert r.status_code == 200
        print("PASS: dashboard/trends analyst")

    def test_trends_viewer_forbidden(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=auth_headers(viewer_token))
        assert r.status_code == 403
        print("PASS: dashboard/trends viewer returns 403")


# ─── Users ────────────────────────────────────────────────────────────────────

class TestUsers:
    """User management - admin only"""

    def test_list_users_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: list users admin")

    def test_list_users_viewer_forbidden(self, viewer_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=auth_headers(viewer_token))
        assert r.status_code == 403
        print("PASS: list users viewer returns 403")

    def test_list_users_analyst_forbidden(self, analyst_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=auth_headers(analyst_token))
        assert r.status_code == 403
        print("PASS: list users analyst returns 403")

    def test_create_user_admin(self, admin_token):
        import time
        ts = int(time.time())
        payload = {"name": "TEST_NewUser", "email": f"testuser_admin_{ts}@example.com", "password": "password123", "role": "viewer"}
        r = requests.post(f"{BASE_URL}/api/users", json=payload, headers=auth_headers(admin_token))
        assert r.status_code == 201
        data = r.json()
        user = data.get("user") or data
        assert user.get("role") == "viewer"
        print("PASS: create user admin")
        return (user.get("_id") or user.get("id"))

    def test_create_user_viewer_forbidden(self, viewer_token):
        r = requests.post(f"{BASE_URL}/api/users", json={"name": "x", "email": "x@x.com", "password": "123456"}, headers=auth_headers(viewer_token))
        assert r.status_code == 403
        print("PASS: create user viewer returns 403")

    def test_update_user_admin(self, admin_token):
        import time
        ts = int(time.time())
        # Create a user first
        payload = {"name": "TEST_UpdateUser", "email": f"updateuser_{ts}@example.com", "password": "password123", "role": "viewer"}
        create_r = requests.post(f"{BASE_URL}/api/users", json=payload, headers=auth_headers(admin_token))
        assert create_r.status_code == 201
        user = create_r.json().get("user") or create_r.json()
        user_id = user.get("_id") or user.get("id")

        r = requests.put(f"{BASE_URL}/api/users/{user_id}", json={"name": "TEST_Updated"}, headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: update user admin")

    def test_delete_user_admin(self, admin_token):
        import time
        ts = int(time.time())
        payload = {"name": "TEST_DeleteUser", "email": f"deleteuser_{ts}@example.com", "password": "password123", "role": "viewer"}
        create_r = requests.post(f"{BASE_URL}/api/users", json=payload, headers=auth_headers(admin_token))
        assert create_r.status_code == 201
        user = create_r.json().get("user") or create_r.json()
        user_id = user.get("_id") or user.get("id")

        r = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers(admin_token))
        assert r.status_code in [200, 204]
        print("PASS: delete user admin")

    def test_toggle_user_status(self, admin_token):
        import time
        ts = int(time.time())
        payload = {"name": "TEST_StatusUser", "email": f"statususer_{ts}@example.com", "password": "password123", "role": "viewer"}
        create_r = requests.post(f"{BASE_URL}/api/users", json=payload, headers=auth_headers(admin_token))
        assert create_r.status_code == 201
        user = create_r.json().get("user") or create_r.json()
        user_id = user.get("_id") or user.get("id")

        r = requests.patch(f"{BASE_URL}/api/users/{user_id}/status", headers=auth_headers(admin_token))
        assert r.status_code == 200
        print("PASS: toggle user status")
