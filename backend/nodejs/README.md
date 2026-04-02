# Finance Data Processing & Access Control Backend

A backend for a finance dashboard system featuring role-based access control, financial records management, and analytics APIs.

## Tech Stack

- **Runtime**: Node.js v20 + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (Bearer tokens)
- **Docs**: Swagger / OpenAPI 3.0

---

## Setup & Run

```bash
# 1. Install dependencies
cd backend/nodejs
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start the server
node server.js
```

### Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=finance_db
JWT_SECRET=your-64-char-secret-here
JWT_EXPIRES_IN=7d
NODE_PORT=8001
```

---

## Swagger Docs

Once running, visit:

```
http://localhost:8001/api/docs
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
| POST   | /api/auth/logout      | Logout                   | Yes  |

### Financial Records
| Method | Path                  | Description                         | Role     |
|--------|-----------------------|-------------------------------------|----------|
| GET    | /api/records          | List records (filter/paginate)      | All      |
| POST   | /api/records          | Create record                       | Admin    |
| GET    | /api/records/:id      | Get single record                   | All      |
| PUT    | /api/records/:id      | Update record                       | Admin    |
| DELETE | /api/records/:id      | Soft delete record                  | Admin    |

**Query Filters (`GET /api/records`)**:
- `type` — `income` or `expense`
- `category` — partial match (case-insensitive)
- `startDate` / `endDate` — date range (`YYYY-MM-DD`)
- `search` — searches description and category
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
  "email": "string (unique, lowercase)",
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
  "createdBy": "User ObjectId (ref)",
  "isDeleted": false,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## Project Structure

```
nodejs/
├── server.js               # Express app entry point, Swagger setup, DB seed
└── src/
    ├── config/
    │   ├── db.js           # MongoDB connection (Mongoose)
    │   ├── swagger.js      # OpenAPI 3.0 spec configuration
    │   └── seed.js         # Initial data seeding (users + records)
    ├── middleware/
    │   ├── auth.js         # JWT verification middleware
    │   └── roles.js        # Role-based access control factory
    ├── models/
    │   ├── User.js         # Mongoose User schema + bcrypt hooks
    │   └── Record.js       # Mongoose Financial Record schema (soft delete)
    └── routes/
        ├── auth.js         # Authentication routes
        ├── users.js        # User management routes (admin)
        ├── records.js      # Financial record CRUD routes
        └── dashboard.js    # Analytics / summary routes
```

---

## Design Decisions & Assumptions

1. **JWT Bearer tokens** (not cookies) — stateless, suitable for any client (web, mobile, CLI).
2. **Soft delete** — records are marked `isDeleted: true` rather than physically removed, preserving audit history. A Mongoose query pre-hook automatically filters deleted records from all normal queries.
3. **Role hierarchy** — Viewer gets read access + basic dashboard; Analyst gets all reads + advanced analytics (trends, categories); Admin gets full CRUD + user management.
4. **Seed data** — on first startup, 3 users (one per role) and 37 financial records spanning 6 months are created automatically. Subsequent restarts are idempotent.
5. **Dual validation** — `express-validator` validates request bodies at the route level; Mongoose schema validators act as a second layer for data integrity.
6. **Category aggregation** — dashboard categories endpoint computes both income and expense totals per category in a single MongoDB aggregation pipeline pass.
7. **Monthly trends** — grouped via MongoDB `$year`/`$month` operators on the record date; configurable number of past months via `?months=N` query param.
8. **Status toggle** — `PATCH /api/users/:id/status` accepts optional `isActive` boolean; if omitted, it toggles the current value.
