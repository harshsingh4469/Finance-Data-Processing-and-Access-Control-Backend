const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Data Processing & Access Control API',
      version: '1.0.0',
      description: `
## Finance Backend API

A role-based access control backend for a finance dashboard system.

### Roles & Permissions

| Endpoint | Viewer | Analyst | Admin |
|---|---|---|---|
| GET /api/records | ✅ | ✅ | ✅ |
| POST/PUT/DELETE /api/records | ❌ | ❌ | ✅ |
| GET /api/dashboard/summary | ✅ | ✅ | ✅ |
| GET /api/dashboard/recent | ✅ | ✅ | ✅ |
| GET /api/dashboard/categories | ❌ | ✅ | ✅ |
| GET /api/dashboard/trends | ❌ | ✅ | ✅ |
| /api/users (CRUD) | ❌ | ❌ | ✅ |

### Authentication
Use **Bearer token** from \`POST /api/auth/login\` response in the Authorization header.

### Default Seed Credentials
- Admin: \`admin@findata.com\` / \`admin123\`
- Analyst: \`analyst@findata.com\` / \`analyst123\`
- Viewer: \`viewer@findata.com\` / \`viewer123\`
      `,
      contact: { name: 'Finance Backend API' },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:8001',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Record: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            amount: { type: 'number', example: 5000 },
            type: { type: 'string', enum: ['income', 'expense'] },
            category: { type: 'string', example: 'Salary' },
            date: { type: 'string', format: 'date' },
            description: { type: 'string' },
            createdBy: { type: 'string' },
            isDeleted: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
