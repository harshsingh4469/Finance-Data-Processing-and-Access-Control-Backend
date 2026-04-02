# FinanceAPI — Data Processing & Access Control Backend

A structured, role-based backend system for managing financial records and serving dashboard-level analytics. Built as a clean demonstration of backend architecture, access control logic, and data modeling using Node.js, Express, and MongoDB.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Access Control Design](#access-control-design)
- [Error Handling](#error-handling)
- [Seed Data](#seed-data)
- [Design Decisions](#design-decisions)

---

## Overview

FinanceAPI is a backend service designed to support a multi-role finance dashboard. It handles:

- **User management** with role-based access (viewer, analyst, admin)
- **Financial record CRUD** — income and expense entries with filtering, search, and pagination
- **Dashboard analytics** — aggregated summaries, category breakdowns, and monthly trends
- **JWT-based authentication** with middleware-level access enforcement

The API is fully documented via Swagger UI and follows RESTful conventions with consistent error responses and input validation at every layer.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Runtime        | Node.js v20                       |
| Framework      | Express.js                        |
| Database       | MongoDB                           |
| ODM            | Mongoose                          |
| Auth           | JWT (jsonwebtoken + bcryptjs)     |
| Validation     | express-validator                 |
| Documentation  | swagger-jsdoc + swagger-ui-express|
| HTTP Logging   | Morgan                            |

---

## Project Structure

```
nodejs/
├── server.js                    # App entry point: Express setup, route mounting, Swagger, DB seed
└── src/
    ├── config/
    │   ├── db.js                # MongoDB connection via Mongoose
    │   ├── swagger.js           # OpenAPI 3.0 specification config
    │   └── seed.js              # Seed users and sample financial records on startup
    │
    ├── middleware/
    │   ├── auth.js              # JWT verification — extracts and validates Bearer token
    │   └── roles.js             # RBAC factory — requireRole('admin') / requireRole('analyst','admin')
    │
    ├── models/
    │   ├── User.js              # User schema: name, email, password (hashed), role, isActive
    │   └── Record.js            # Financial record schema: amount, type, category, date, soft delete
    │
    └── routes/
        ├── auth.js              # POST /register, POST /login, GET /me, POST /logout
        ├── users.js             # Admin-only user management CRUD + status toggle
        ├── records.js           # Financial records CRUD with filters, pagination, search
        └── dashboard.js         # Summary, category breakdown, monthly trends, recent activity
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB running locally or a connection URI (MongoDB Atlas)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd nodejs

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# Start the server
node server.js
```

The server starts on `http://localhost:8001` by default.

On first run, seed data is automatically inserted: 3 users (one per role) and 37 financial records spanning 6 months.

### Swagger UI

```
http://localhost:8001/api/docs
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=finance_db
JWT_SECRET=your-strong-64-char-secret-here
JWT_EXPIRES_IN=7d
NODE_PORT=8001
```

| Variable       | Description                              | Default               |
|----------------|------------------------------------------|-----------------------|
| `MONGO_URL`    | MongoDB connection string                | mongodb://localhost:27017 |
| `DB_NAME`      | MongoDB database name                    | finance_db            |
| `JWT_SECRET`   | Secret key for signing JWT tokens        | required              |
| `JWT_EXPIRES_IN` | Token expiry duration                  | 7d                    |
| `NODE_PORT`    | Port the server listens on               | 8001                  |

---

## Authentication

The API uses **stateless JWT authentication**. On successful login, a token is returned in the response body. Pass this token in all subsequent requests via the `Authorization` header:

```
Authorization: Bearer <your_token_here>
```

### Login

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@findata.com", "password": "admin123"}'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "Admin User",
    "email": "admin@findata.com",
    "role": "admin",
    "isActive": true
  }
}
```

### Default Seed Credentials

| Role     | Email                 | Password     |
|----------|-----------------------|--------------|
| Admin    | admin@findata.com     | admin123     |
| Analyst  | analyst@findata.com   | analyst123   |
| Viewer   | viewer@findata.com    | viewer123    |

---

## Roles & Permissions

The system defines three roles with progressively expanding access:

| Endpoint                        | Viewer | Analyst | Admin |
|---------------------------------|--------|---------|-------|
| POST /api/auth/login            | ✅     | ✅      | ✅    |
| GET /api/auth/me                | ✅     | ✅      | ✅    |
| GET /api/records                | ✅     | ✅      | ✅    |
| GET /api/records/:id            | ✅     | ✅      | ✅    |
| POST /api/records               | ❌     | ❌      | ✅    |
| PUT /api/records/:id            | ❌     | ❌      | ✅    |
| DELETE /api/records/:id         | ❌     | ❌      | ✅    |
| GET /api/dashboard/summary      | ✅     | ✅      | ✅    |
| GET /api/dashboard/recent       | ✅     | ✅      | ✅    |
| GET /api/dashboard/categories   | ❌     | ✅      | ✅    |
| GET /api/dashboard/trends       | ❌     | ✅      | ✅    |
| GET /api/users                  | ❌     | ❌      | ✅    |
| POST /api/users                 | ❌     | ❌      | ✅    |
| PUT/DELETE /api/users/:id       | ❌     | ❌      | ✅    |
| PATCH /api/users/:id/status     | ❌     | ❌      | ✅    |

**Role summary:**
- **Viewer** — Read-only access to records and basic dashboard (summary + recent activity).
- **Analyst** — Everything a Viewer can do, plus advanced analytics: category breakdowns and monthly trends.
- **Admin** — Full access: manage records, manage users, and all analytics.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint       | Description                          | Auth Required |
|--------|----------------|--------------------------------------|---------------|
| POST   | /register      | Register a new user                  | No            |
| POST   | /login         | Login and receive a JWT token        | No            |
| GET    | /me            | Get the currently authenticated user | Yes           |
| POST   | /logout        | Logout (client discards token)       | Yes           |

---

### Financial Records — `/api/records`

| Method | Endpoint   | Description                       | Role Required |
|--------|------------|-----------------------------------|---------------|
| GET    | /          | List records with filters         | Any           |
| POST   | /          | Create a new record               | Admin         |
| GET    | /:id       | Get a single record by ID         | Any           |
| PUT    | /:id       | Update a record                   | Admin         |
| DELETE | /:id       | Soft delete a record              | Admin         |

#### Query Parameters for `GET /api/records`

| Param       | Type    | Description                                      |
|-------------|---------|--------------------------------------------------|
| `type`      | string  | Filter by `income` or `expense`                  |
| `category`  | string  | Partial, case-insensitive category match         |
| `startDate` | date    | Filter records on or after this date (YYYY-MM-DD)|
| `endDate`   | date    | Filter records on or before this date            |
| `search`    | string  | Full-text search in description and category     |
| `page`      | integer | Page number (default: 1)                         |
| `limit`     | integer | Results per page (default: 10, max: 100)         |
| `sortBy`    | string  | Sort field: `date`, `amount`, or `category`      |
| `sortOrder` | string  | `asc` or `desc` (default: `desc`)                |

**Example:**
```bash
# Get all income records for March 2025, sorted by amount
GET /api/records?type=income&startDate=2025-03-01&endDate=2025-03-31&sortBy=amount&sortOrder=desc
```

---

### Dashboard — `/api/dashboard`

| Method | Endpoint      | Description                                   | Role Required    |
|--------|---------------|-----------------------------------------------|------------------|
| GET    | /summary      | Total income, expenses, and net balance       | Any              |
| GET    | /recent       | Most recent N records                         | Any              |
| GET    | /categories   | Income and expense totals grouped by category | Analyst + Admin  |
| GET    | /trends       | Monthly income vs expense for last N months   | Analyst + Admin  |

#### `GET /api/dashboard/summary` — Optional query params: `startDate`, `endDate`

**Response:**
```json
{
  "totalIncome": 34500,
  "totalExpenses": 15100.5,
  "netBalance": 19399.5,
  "recordCount": 37,
  "incomeCount": 9,
  "expenseCount": 28
}
```

#### `GET /api/dashboard/categories` — Optional query params: `type`, `startDate`, `endDate`

**Response:**
```json
{
  "data": [
    { "category": "Salary",  "income": 30000, "expense": 0,    "count": 6 },
    { "category": "Rent",    "income": 0,     "expense": 9000, "count": 6 },
    { "category": "Freelance", "income": 2000, "expense": 0,   "count": 2 }
  ]
}
```

#### `GET /api/dashboard/trends` — Optional query param: `months` (default: 6, max: 24)

**Response:**
```json
{
  "months": 6,
  "data": [
    { "period": "2025-11", "income": 5000, "expense": 1937, "net": 3063 },
    { "period": "2025-12", "income": 5000, "expense": 2330, "net": 2670 }
  ]
}
```

---

### User Management — `/api/users` *(Admin only)*

| Method | Endpoint       | Description                          |
|--------|----------------|--------------------------------------|
| GET    | /              | List all users (paginated)           |
| POST   | /              | Create a new user                    |
| GET    | /:id           | Get a user by ID                     |
| PUT    | /:id           | Update user name, email, or role     |
| DELETE | /:id           | Delete a user                        |
| PATCH  | /:id/status    | Toggle or set user active/inactive   |

---

## Data Models

### User

```javascript
{
  name:      String,   // required
  email:     String,   // required, unique, lowercase
  password:  String,   // bcrypt hashed, never returned in responses
  role:      String,   // enum: ['viewer', 'analyst', 'admin'], default: 'viewer'
  isActive:  Boolean,  // default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Financial Record

```javascript
{
  amount:      Number,   // required, must be > 0
  type:        String,   // enum: ['income', 'expense'], required
  category:    String,   // required, e.g. 'Salary', 'Rent', 'Freelance'
  date:        Date,     // required
  description: String,   // optional
  createdBy:   ObjectId, // ref: User
  isDeleted:   Boolean,  // default: false (soft delete)
  createdAt:   Date,
  updatedAt:   Date
}
```

---

## Access Control Design

Role enforcement is implemented as a **middleware factory** (`requireRole`) that is applied at the route level:

```javascript
// Restrict to admin only
router.post('/', authenticate, requireRole('admin'), createRecord);

// Restrict to analyst or admin
router.get('/trends', authenticate, requireRole('analyst', 'admin'), getTrends);

// All authenticated users
router.get('/', authenticate, listRecords);
```

The `authenticate` middleware:
1. Extracts the Bearer token from the `Authorization` header
2. Verifies the JWT signature and expiry
3. Looks up the user in the database
4. Checks `isActive` status
5. Attaches the user object to `req.user`

The `requireRole` factory then checks `req.user.role` against the allowed roles list.

---

## Error Handling

All errors return a consistent JSON structure:

```json
{
  "message": "Human-readable error description",
  "errors": [ ... ]  // present on 400 validation errors only
}
```

| Status Code | Meaning                                    |
|-------------|--------------------------------------------|
| 400         | Validation failed — missing or invalid input |
| 401         | Not authenticated — missing or invalid token |
| 403         | Forbidden — authenticated but insufficient role |
| 404         | Resource not found                          |
| 500         | Internal server error                       |

---

## Seed Data

On first startup, the following is seeded automatically (idempotent — safe to restart):

**Users:**
- `admin@findata.com` — role: admin
- `analyst@findata.com` — role: analyst
- `viewer@findata.com` — role: viewer

**Financial Records (37 entries across 6 months):**
- Monthly salary income ($5,000/month)
- Freelance and investment income
- Rent ($1,500/month)
- Groceries, utilities, transport, entertainment, healthcare, savings

This provides meaningful data for all dashboard analytics endpoints out of the box.

---

## Design Decisions

**1. Stateless JWT over sessions**
Tokens are returned in the response body and sent via the `Authorization` header. This keeps the API stateless and client-agnostic — works equally well for web frontends, mobile apps, or CLI tools.

**2. Soft Delete**
Records are never physically removed. Instead, `isDeleted: true` is set. A Mongoose query pre-hook automatically filters these out from all standard queries. This preserves the audit trail without additional effort from callers.

**3. Two-layer validation**
Request bodies are validated with `express-validator` at the route level for clear user-facing error messages. Mongoose schema-level validators serve as a second safety net for data integrity at the persistence layer.

**4. Single aggregation pass for categories**
The `/dashboard/categories` endpoint groups by both category and type in a single MongoDB `$group` stage, then reshapes in JavaScript. This avoids two separate database queries.

**5. Configurable trend window**
`/dashboard/trends` accepts a `?months=N` parameter (default: 6, max: 24). The time window is computed at query time from the current date, so no scheduled jobs or materialized views are needed.

**6. Role distinction at the analytics layer**
Viewers and Analysts both have read access to records. The meaningful distinction is at the dashboard level: Analysts get access to richer analytical endpoints (trends, category breakdowns) that require aggregation pipelines, while Viewers get simpler summary data.

**7. Idempotent seeding**
The seed function checks for existing records before inserting. Restarting the server never creates duplicate data.

**8. Password never returned**
The Mongoose schema uses a `toJSON` transform to strip the `password` field from all serialized user documents. There is no risk of accidentally leaking it in any response.
