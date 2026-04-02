# Finance Data Processing & Access Control Backend

A production-ready backend for a finance dashboard system featuring role-based access control, financial records management, and analytics APIs.

## Tech Stack

- **Runtime**: Node.js v20 + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (Bearer tokens)
- **Docs**: Swagger / OpenAPI 3.0

---

## Live API

**Base URL**: `https://findata-core.preview.emergentagent.com`

**Swagger Docs**: `https://findata-core.preview.emergentagent.com/api/docs`

---

## Quick Start (Local)

```bash
cd backend/nodejs
npm install
# Copy .env from /app/backend/.env or set these variables:
export MONGO_URL=mongodb://localhost:27017
export DB_NAME=finance_db
export JWT_SECRET=your-secret-here
export NODE_PORT=8002
node server.js
```

---

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <token>
```

Get a token via `POST /api/auth/login`.

### Default Seed Credentials

| Role     | Email                   | Password     |
|----------|-------------------------|--------------|
| Admin    | admin@findata.com       | admin123     |
| Analyst  | analyst@findata.com     | analyst123   |
| Viewer   | viewer@findata.com      | viewer123    |

---

## Roles & Permissions

| Endpoint                         | Viewer | Analyst | Admin |
|----------------------------------|--------|---------|-------|
| `GET /api/records`               | ✅     | ✅      | ✅    |
| `POST /api/records`              | ❌     | ❌      | ✅    |
| `PUT /api/records/:id`           | ❌     | ❌      | ✅    |
| `DELETE /api/records/:id`        | ❌     | ❌      | ✅    |
| `GET /api/dashboard/summary`     | ✅     | ✅      | ✅    |
| `GET /api/dashboard/recent`      | ✅     | ✅      | ✅    |
| `GET /api/dashboard/categories`  | ❌     | ✅      | ✅    |
| `GET /api/dashboard/trends`      | ❌     | ✅      | ✅    |
| `GET /api/users`                 | ❌     | ❌      | ✅    |
| `POST/PUT/DELETE /api/users`     | ❌     | ❌      | ✅    |

---

## API Endpoints

### Auth
| Method | Path                  | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| POST   | /api/auth/register    | Register new user        | No   |
| POST   | /api/auth/login       | Login (returns JWT)      | No   |
| GET    | /api/auth/me          | Get current user         | Yes  |
| POST   | /api/auth/logout      | Logout (discard token)   | Yes  |

### Financial Records
| Method | Path                  | Description                         | Role     |
|--------|-----------------------|-------------------------------------|----------|
| GET    | /api/records          | List records (filter/paginate)      | All      |
| POST   | /api/records          | Create record                       | Admin    |
| GET    | /api/records/:id      | Get single record                   | All      |
| PUT    | /api/records/:id      | Update record                       | Admin    |
| DELETE | /api/records/:id      | Soft delete record                  | Admin    |

**Query Filters (GET /api/records)**:
- `type` — `income` or `expense`
- `category` — partial match (case-insensitive)
- `startDate` / `endDate` — date range (`YYYY-MM-DD`)
- `search` — full-text search in description/category
- `page`, `limit` — pagination
- `sortBy` — `date` | `amount` | `category`
- `sortOrder` — `asc` | `desc`

### Dashboard
| Method | Path                        | Description              | Role            |
|--------|-----------------------------|--------------------------|-----------------|
| GET    | /api/dashboard/summary      | Income/expense totals    | All             |
| GET    | /api/dashboard/recent       | Recent N records         | All             |
| GET    | /api/dashboard/categories   | Category breakdown       | Analyst + Admin |
| GET    | /api/dashboard/trends       | Monthly trends           | Analyst + Admin |

### Users (Admin Only)
| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/users              | List users               |
| POST   | /api/users              | Create user              |
| GET    | /api/users/:id          | Get user                 |
| PUT    | /api/users/:id          | Update user              |
| DELETE | /api/users/:id          | Delete user              |
| PATCH  | /api/users/:id/status   | Toggle active/inactive   |

---

## Data Models

### User
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "role": "viewer | analyst | admin",
  "isActive": true,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Financial Record
```json
{
  "_id": "ObjectId",
  "amount": 5000,
  "type": "income | expense",
  "category": "Salary",
  "date": "ISO date",
  "description": "Monthly salary",
  "createdBy": "User ObjectId",
  "isDeleted": false,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## Architecture

```
backend/nodejs/
├── server.js               # Express app entry point, Swagger, seed
└── src/
    ├── config/
    │   ├── db.js           # MongoDB connection
    │   ├── swagger.js      # OpenAPI spec config
    │   └── seed.js         # Initial data seeding
    ├── middleware/
    │   ├── auth.js         # JWT verify middleware
    │   └── roles.js        # Role-based access control factory
    ├── models/
    │   ├── User.js         # Mongoose User model
    │   └── Record.js       # Mongoose Financial Record model
    └── routes/
        ├── auth.js         # Auth routes
        ├── users.js        # User management routes
        ├── records.js      # Financial record CRUD routes
        └── dashboard.js    # Analytics/summary routes
```

The project runs inside a platform that uses Python/uvicorn as a gateway on port 8001. The Node.js Express server runs on port 8002, and Python forwards all requests to it via an HTTP proxy.

---

## Design Decisions & Assumptions

1. **JWT Bearer tokens** (not cookies) — more appropriate for a pure API backend consumed by any frontend.
2. **Soft delete** — records are marked `isDeleted: true` rather than physically removed, preserving audit history. A Mongoose query pre-hook automatically filters them out from normal queries.
3. **Role hierarchy** — Viewer (read-only + basic dashboard), Analyst (all reads + advanced analytics), Admin (full CRUD + user management). The distinction between Viewer and Analyst is primarily at the dashboard level — analysts get trend and category breakdown insights.
4. **Seed data** — on startup, three users (one per role) and 37 financial records spanning 6 months are seeded if the DB is empty. This makes the dashboard analytics immediately meaningful.
5. **Input validation** — `express-validator` validates all request bodies; MongoDB schema validators serve as a second layer.
6. **Pagination** — all list endpoints support `page`/`limit` query params.
7. **Search** — records endpoint supports full-text search across description and category.
8. **Category aggregation** — the dashboard computes both income and expense totals per category in a single aggregation pipeline pass.
9. **Monthly trends** — computed via MongoDB `$group` on `$year`/`$month` of the record date; defaults to last 6 months.
