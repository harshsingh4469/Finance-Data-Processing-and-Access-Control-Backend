# FinanceAPI — Data Processing & Access Control Backend

> A role-based backend system built to manage financial records, enforce access policies, and serve dashboard-level analytics. Designed with clean separation of concerns, layered validation, and a clear mental model for how data flows through the system.

---

## Table of Contents

- [Why I Built It This Way](#why-i-built-it-this-way)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started Locally](#getting-started-locally)
- [Environment Variables](#environment-variables)
- [Live Deployment](#live-deployment)
- [Authentication Flow](#authentication-flow)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Access Control Design](#access-control-design)
- [Error Handling](#error-handling)
- [Seed Data](#seed-data)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)

---

## Why I Built It This Way

When I approached this problem, the first question I asked was — *who is actually using this system, and what do they need?*

Three distinct users emerged: a **viewer** who just needs to check numbers, an **analyst** who needs to dig deeper into trends and breakdowns, and an **admin** who manages the whole system. That single observation shaped every routing decision, every middleware choice, and every API response structure in this codebase.

Rather than bolting on access control as an afterthought, I made it a first-class concern from the start — a composable `requireRole()` middleware that reads naturally at the route level and fails loudly when misused.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js v20 | Non-blocking I/O, great ecosystem for REST APIs |
| Framework | Express.js | Minimal, battle-tested, easy to reason about |
| Database | MongoDB | Flexible schema suits evolving financial data |
| ODM | Mongoose | Schema enforcement + lifecycle hooks at the model level |
| Auth | JWT + bcryptjs | Stateless tokens — no session store needed |
| Validation | express-validator | Declarative, per-route validation rules |
| Docs | Swagger / OpenAPI 3.0 | Auto-generated, always in sync with the code |
| Logging | Morgan | HTTP request logging out of the box |

---

## System Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Client (Browser/App)       │
                        └──────────────┬──────────────────────┘
                                       │ HTTPS
                        ┌──────────────▼──────────────────────┐
                        │         Express.js Server            │
                        │                                      │
                        │   ┌─────────────────────────────┐   │
                        │   │        Middleware Layer       │   │
                        │   │  cors → morgan → json body   │   │
                        │   └──────────────┬──────────────┘   │
                        │                  │                   │
                        │   ┌──────────────▼──────────────┐   │
                        │   │       Route Layer            │   │
                        │   │  /api/auth  /api/records     │   │
                        │   │  /api/users /api/dashboard   │   │
                        │   └──────────────┬──────────────┘   │
                        │                  │                   │
                        │   ┌──────────────▼──────────────┐   │
                        │   │     Auth Middleware           │   │
                        │   │  authenticate → requireRole  │   │
                        │   └──────────────┬──────────────┘   │
                        │                  │                   │
                        │   ┌──────────────▼──────────────┐   │
                        │   │     Controller Logic         │   │
                        │   │  validate → query → respond  │   │
                        │   └──────────────┬──────────────┘   │
                        │                  │                   │
                        │   ┌──────────────▼──────────────┐   │
                        │   │       Mongoose ODM            │   │
                        │   │  Schema hooks → Aggregations │   │
                        │   └──────────────┬──────────────┘   │
                        └──────────────────┼──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │           MongoDB Atlas              │
                        │   users collection                   │
                        │   records collection                 │
                        └─────────────────────────────────────┘
```

### Request Lifecycle

Every incoming request passes through the same predictable pipeline:

```
Request → CORS → Body Parse → Route Match → authenticate()
       → requireRole() → express-validator → Controller → MongoDB → Response
```

If anything fails along the way — expired token, wrong role, invalid input — it short-circuits immediately with a consistent JSON error. No request ever reaches the database with bad data.

### Access Control Model

```
┌──────────┬────────────────────────────────────────────────────────┐
│ Role     │ What they can do                                        │
├──────────┼────────────────────────────────────────────────────────┤
│ viewer   │ Read records, view summary + recent dashboard           │
│ analyst  │ Everything viewer can + trends & category breakdowns    │
│ admin    │ Full CRUD on records + complete user management         │
└──────────┴────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
backend/nodejs/
│
├── server.js                    # Entry point — wires everything together
│
└── src/
    ├── config/
    │   ├── db.js                # MongoDB connection (single responsibility)
    │   ├── swagger.js           # OpenAPI spec — auto-synced with route JSDoc
    │   └── seed.js              # Idempotent seed — safe to run on every restart
    │
    ├── middleware/
    │   ├── auth.js              # Verifies JWT, hydrates req.user
    │   └── roles.js             # requireRole() factory — composable RBAC
    │
    ├── models/
    │   ├── User.js              # bcrypt hook, toJSON strip, role enum
    │   └── Record.js            # Soft delete hook, compound index
    │
    └── routes/
        ├── auth.js              # register, login, me, logout
        ├── users.js             # Admin-only user management
        ├── records.js           # CRUD + filter + search + pagination
        └── dashboard.js         # Aggregation pipelines for analytics
```

The structure is intentionally flat and obvious. A new engineer should be able to find any piece of logic within 10 seconds.

---

## Getting Started Locally

### Prerequisites
- Node.js v18 or above
- MongoDB running locally **or** a MongoDB Atlas free cluster

### Clone & Install

```bash
git clone https://github.com/harshsingh4469/Finance-Data-Processing-and-Access-Control-Backend.git
cd Finance-Data-Processing-and-Access-Control-Backend/backend/nodejs
npm install
```

### Set Up Environment

Create a `.env` file inside `backend/nodejs/`:

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### Run

```bash
node server.js
```

Server starts at `http://localhost:8001`

On first run, seed data is automatically inserted — 3 users and 37 financial records across 6 months. You can start testing immediately.

### Open Swagger Docs

```
http://localhost:8001/api/docs
```

---

## Environment Variables

Create a `.env` file in `backend/nodejs/` with the following:

```env
# MongoDB connection string
# Local:  mongodb://localhost:27017
# Atlas:  mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGO_URL=mongodb://localhost:27017

# Database name
DB_NAME=finance_db

# JWT secret — use a long random string in production (min 32 chars)
JWT_SECRET=your-super-secret-key-here

# Token expiry
JWT_EXPIRES_IN=7d

# Port the server listens on
NODE_PORT=8001

# Your deployed base URL (used by Swagger UI server dropdown)
# Leave as localhost for local dev, set to your hosted URL in production
API_BASE_URL=http://localhost:8001
```

### For Deployment (Render / Railway / etc.)

Set these as environment variables in your hosting dashboard — do **not** commit `.env` to git.

| Variable | Production Value Example |
|---|---|
| `MONGO_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/finance_db?retryWrites=true&w=majority` |
| `DB_NAME` | `finance_db` |
| `JWT_SECRET` | any 64-char random string |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_PORT` | `10000` (Render) or `8080` (Railway) |
| `API_BASE_URL` | `https://your-app.onrender.com` |

> **MongoDB Atlas tip:** If your password contains special characters like `@`, `#`, or `!` — URL-encode them. Example: `@` becomes `%40`. The safest approach is to use a password with only letters and numbers.

---

## Live Deployment

| | |
|---|---|
| **Live API** | https://finance-data-processing-and-access-k9rq.onrender.com |
| **Swagger Docs** | https://finance-data-processing-and-access-k9rq.onrender.com/api/docs |
| **Health Check** | https://finance-data-processing-and-access-k9rq.onrender.com/api/health |

> Hosted on Render free tier — first request after inactivity may take ~30 seconds to wake up.

---

## Authentication Flow

This API uses **stateless JWT authentication**. Here's the full flow:

```
1. POST /api/auth/login  →  returns { token, user }
2. Store token on client
3. Send token with every request:
   Authorization: Bearer <token>
4. Server verifies signature + expiry on each request
5. User object attached to req.user for downstream use
```

### Quick Login Test

```bash
curl -X POST https://finance-data-processing-and-access-k9rq.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@findata.com", "password": "admin123"}'
```

### Seed Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@findata.com | admin123 |
| Analyst | analyst@findata.com | analyst123 |
| Viewer | viewer@findata.com | viewer123 |

---

## Roles & Permissions

| Endpoint | Viewer | Analyst | Admin |
|---|---|---|---|
| POST /api/auth/login | ✅ | ✅ | ✅ |
| GET /api/auth/me | ✅ | ✅ | ✅ |
| GET /api/records | ✅ | ✅ | ✅ |
| GET /api/records/:id | ✅ | ✅ | ✅ |
| POST /api/records | ❌ | ❌ | ✅ |
| PUT /api/records/:id | ❌ | ❌ | ✅ |
| DELETE /api/records/:id | ❌ | ❌ | ✅ |
| GET /api/dashboard/summary | ✅ | ✅ | ✅ |
| GET /api/dashboard/recent | ✅ | ✅ | ✅ |
| GET /api/dashboard/categories | ❌ | ✅ | ✅ |
| GET /api/dashboard/trends | ❌ | ✅ | ✅ |
| /api/users (all) | ❌ | ❌ | ✅ |

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /register | Register a new user | No |
| POST | /login | Login, get JWT token | No |
| GET | /me | Get current user | Yes |
| POST | /logout | Logout | Yes |

---

### Records — `/api/records`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | / | List with filters + pagination | Any |
| POST | / | Create a record | Admin |
| GET | /:id | Get single record | Any |
| PUT | /:id | Update a record | Admin |
| DELETE | /:id | Soft delete | Admin |

**Supported query params for `GET /api/records`:**

```
type        income | expense
category    partial match, case-insensitive
startDate   YYYY-MM-DD
endDate     YYYY-MM-DD
search      searches description + category
page        default: 1
limit       default: 10, max: 100
sortBy      date | amount | category
sortOrder   asc | desc
```

---

### Dashboard — `/api/dashboard`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | /summary | Total income, expenses, net balance | Any |
| GET | /recent | Last N records | Any |
| GET | /categories | Breakdown by category | Analyst + Admin |
| GET | /trends | Monthly income vs expense | Analyst + Admin |

---

### Users — `/api/users` *(Admin only)*

| Method | Endpoint | Description |
|---|---|---|
| GET | / | List all users |
| POST | / | Create user |
| GET | /:id | Get user |
| PUT | /:id | Update user |
| DELETE | /:id | Delete user |
| PATCH | /:id/status | Toggle active / inactive |

---

## Data Models

### User

```javascript
{
  name:      String,    // required
  email:     String,    // unique, lowercase, validated
  password:  String,    // bcrypt hashed — never returned in any response
  role:      String,    // "viewer" | "analyst" | "admin"
  isActive:  Boolean,   // inactive users cannot log in
  createdAt: Date,
  updatedAt: Date
}
```

### Financial Record

```javascript
{
  amount:      Number,    // required, must be > 0
  type:        String,    // "income" | "expense"
  category:    String,    // "Salary", "Rent", "Freelance", etc.
  date:        Date,      // required
  description: String,    // optional notes
  createdBy:   ObjectId,  // ref → User
  isDeleted:   Boolean,   // soft delete flag, default false
  createdAt:   Date,
  updatedAt:   Date
}
```

---

## Access Control Design

The access control system is built around two composable middleware functions:

**`authenticate`** — verifies the JWT token and loads the user

```javascript
// src/middleware/auth.js
const token = req.headers.authorization?.slice(7);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.id);
```

**`requireRole`** — a factory that returns a middleware for any role combination

```javascript
// src/middleware/roles.js
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};
```

Used at the route level, it reads like policy documentation:

```javascript
router.get('/',     authenticate,                          listRecords);   // all roles
router.post('/',    authenticate, requireRole('admin'),    createRecord);  // admin only
router.get('/trends', authenticate, requireRole('analyst','admin'), getTrends);
```

---

## Error Handling

All errors return the same JSON shape — predictable for any client:

```json
{
  "message": "Clear description of what went wrong",
  "errors": [ ]
}
```

| Code | Meaning |
|---|---|
| 400 | Bad input — validation failed |
| 401 | Not authenticated — missing or expired token |
| 403 | Authenticated but not allowed — wrong role |
| 404 | Resource does not exist |
| 500 | Something unexpected happened on the server |

---

## Seed Data

On first startup the system seeds itself automatically — safe to restart, never duplicates.

**Users created:**
- `admin@findata.com` — full admin access
- `analyst@findata.com` — analytics + read access
- `viewer@findata.com` — read-only access

**37 financial records across 6 months:**
- Monthly salary income ($5,000/month)
- Freelance + investment income
- Rent, groceries, utilities, transport, entertainment, healthcare, savings

This makes the dashboard analytics endpoints return meaningful data immediately without any manual setup.

---

## Design Decisions & Tradeoffs

**Stateless JWT over sessions**
I chose JWT Bearer tokens over session cookies. It keeps the server stateless, scales horizontally without a shared session store, and works cleanly with any client — browser, mobile, or a CLI tool hitting the API directly.

**Soft delete over hard delete**
Financial records are never physically removed. Setting `isDeleted: true` and filtering via a Mongoose query pre-hook preserves the audit trail. A future `/api/records/deleted` endpoint for admins to review deleted records would be trivial to add.

**Two validation layers**
`express-validator` catches bad input at the route level with friendly, field-specific error messages. Mongoose schema validators act as a second layer at the persistence level. They serve different purposes — one is for the user, one is for data integrity.

**Single aggregation pass for categories**
The `/dashboard/categories` endpoint groups by both `category` and `type` in one `$group` stage, then reshapes the result in JavaScript. Two database queries would have been simpler to write but unnecessary.

**Idempotent seed**
The seed function checks for existing data before inserting. Restarting the server in production, running multiple instances, or re-deploying never causes duplicate users or phantom records.

**Password security**
The Mongoose `toJSON` transform strips the `password` field from every serialized user document. There's no way for it to accidentally leak into a response — not in `/me`, not in a user list, not in a `createdBy` population. It's excluded at the model level, not the controller level.
