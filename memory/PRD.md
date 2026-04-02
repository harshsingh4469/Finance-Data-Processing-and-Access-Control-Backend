# PRD: Finance Data Processing & Access Control Backend

## Original Problem Statement
Backend Developer Intern assignment: Build a Finance Data Processing and Access Control Backend.
Goal: Evaluate backend development skills through API design, data modeling, business logic, and access control.

## User Choices
- **Language**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (Bearer tokens)
- **Output**: Backend only + Swagger/OpenAPI docs
- **Deployment**: Hosted deployed API link

## Architecture

### Stack
- **Runtime**: Node.js v20 + Express.js
- **Database**: MongoDB via Mongoose ODM
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Docs**: swagger-jsdoc + swagger-ui-express
- **Validation**: express-validator
- **Gateway**: Python/FastAPI proxy on port 8001 → Node.js on port 8002

### Project Structure
```
/app/backend/nodejs/
├── server.js              # Entry point, Swagger, seed
└── src/
    ├── config/
    │   ├── db.js          # MongoDB connection
    │   ├── swagger.js     # OpenAPI spec
    │   └── seed.js        # Seed users + records
    ├── middleware/
    │   ├── auth.js        # JWT verify
    │   └── roles.js       # RBAC factory
    ├── models/
    │   ├── User.js        # User schema
    │   └── Record.js      # Financial record schema (soft delete)
    └── routes/
        ├── auth.js        # Auth routes
        ├── users.js       # User management (admin)
        ├── records.js     # Financial CRUD
        └── dashboard.js   # Analytics APIs
```

## Deployed URL
- **API Base**: https://findata-core.preview.emergentagent.com
- **Swagger UI**: https://findata-core.preview.emergentagent.com/api/docs

## Core Requirements Implemented

### 1. User & Role Management ✅
- 3 roles: viewer, analyst, admin
- CRUD for users (admin only)
- Toggle active/inactive status
- Seeded 3 default users on startup

### 2. Financial Records Management ✅
- Fields: amount, type (income/expense), category, date, description
- Full CRUD (admin-only for write ops)
- Soft delete (isDeleted flag)
- Advanced filtering: type, category, date range, search, pagination, sorting

### 3. Dashboard Summary APIs ✅
- GET /api/dashboard/summary — total income, expenses, net balance
- GET /api/dashboard/categories — category-wise breakdowns
- GET /api/dashboard/trends — monthly income vs expense for N months
- GET /api/dashboard/recent — recent N records

### 4. Access Control Logic ✅
- Viewer: read records + basic dashboard (summary, recent)
- Analyst: read records + full dashboard (summary, recent, categories, trends)
- Admin: all viewer/analyst access + CRUD on records + user management
- Enforced via authenticate + requireRole middleware

### 5. Validation & Error Handling ✅
- express-validator on all request bodies
- Mongoose schema-level validation as 2nd layer
- Consistent JSON error responses with appropriate HTTP status codes
- 400 (validation), 401 (not authenticated), 403 (insufficient role), 404 (not found), 500 (server)

### 6. Data Persistence ✅
- MongoDB with Mongoose ODM
- Indexes on email (unique), type/category/date

## Optional Enhancements Implemented
- ✅ Pagination (all list endpoints)
- ✅ Search support (records endpoint)
- ✅ Soft delete
- ✅ API documentation (Swagger/OpenAPI 3.0)

## Test Results
- **47/47 tests passed** (pytest suite)
- Covers: auth, RBAC, records CRUD, dashboard analytics, user management

## Seed Data
- 3 users (admin, analyst, viewer)
- 37 financial records across 6 months (salary, freelance, investment, rent, groceries, utilities, transport, entertainment, healthcare, savings)

## Assumptions & Design Decisions
1. JWT Bearer tokens (stateless, better for pure API)
2. Soft delete preserves audit history; Mongoose query hook auto-filters deleted records
3. Viewer vs Analyst distinction at dashboard level (analysts get advanced analytics)
4. Seed runs once on startup; idempotent (won't duplicate existing data)
5. PATCH /api/users/:id/status toggles status if isActive not provided in body

## What's Been Implemented (Apr 2026)
- Full Node.js/Express backend with JWT auth, RBAC, MongoDB
- 14 API endpoints fully documented in Swagger
- 37-record seed dataset for meaningful analytics
- 47-test pytest suite (100% pass rate)
- Deployed at https://findata-core.preview.emergentagent.com

## Backlog / Future Enhancements
- P2: Rate limiting / brute force lockout on login
- P2: Password reset endpoint
- P2: Audit log (who created/updated/deleted records)
- P3: Pagination on dashboard trends/categories
- P3: Export records as CSV
- P3: Unit tests with Jest for Node.js code directly
