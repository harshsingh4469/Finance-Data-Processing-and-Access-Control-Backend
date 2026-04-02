const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Jane Smith" }
 *               email: { type: string, example: "jane@example.com" }
 *               password: { type: string, example: "password123", minLength: 6 }
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *                 default: viewer
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error or email already in use
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['viewer', 'analyst', 'admin']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { name, email, password, role } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });

      const user = await User.create({ name, email, password, role: role || 'viewer' });
      const token = signToken(user._id);
      res.status(201).json({ token, user });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@findata.com" }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string, description: "Use as Bearer token in Authorization header" }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) return res.status(401).json({ message: 'Invalid email or password' });
      if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

      const token = signToken(user._id);
      const userObj = user.toJSON();
      res.json({ token, user: userObj });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (client should discard token)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully. Discard your token on the client side.' });
});

module.exports = router;
