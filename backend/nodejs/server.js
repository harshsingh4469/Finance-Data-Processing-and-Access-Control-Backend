require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { connectDB } = require('./src/config/db');
const { seedDatabase } = require('./src/config/seed');
const swaggerSpec = require('./src/config/swagger');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const recordRoutes = require('./src/routes/records');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const PORT = parseInt(process.env.NODE_PORT || '8002', 10);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ---------------------------------------------------------------------------
// Swagger UI  (served at /api/docs)
// ---------------------------------------------------------------------------
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Finance API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: { persistAuthorization: true },
  })
);

// Raw OpenAPI JSON
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Finance Backend API', version: '1.0.0' });
});

// Root redirect to docs
app.get('/', (req, res) => res.redirect('/api/docs'));
app.get('/api', (req, res) => res.redirect('/api/docs'));

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const start = async () => {
  await connectDB();
  await seedDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Finance Backend (Node.js) running on port ${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
