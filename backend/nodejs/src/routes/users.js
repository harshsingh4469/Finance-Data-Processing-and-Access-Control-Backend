const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// All user routes require admin role
router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "New User" }
 *               email: { type: string, example: "newuser@example.com" }
 *               password: { type: string, example: "pass123" }
 *               role: { type: string, enum: [viewer, analyst, admin], default: viewer }
 *     responses:
 *       201:
 *         description: User created
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Min 6 characters'),
    body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    try {
      const existing = await User.findOne({ email: req.body.email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });

      const user = await User.create(req.body);
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [viewer, analyst, admin] }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put(
  '/:id',
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    try {
      const { password, ...updateData } = req.body; // prevent password update via this route
      const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete yourself
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Toggle user active/inactive status (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own status' });
    }
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    // If isActive not provided in body, toggle the current value
    const body = req.body || {};
    const newStatus = typeof body.isActive === 'boolean' ? body.isActive : !existing.isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: newStatus },
      { new: true }
    );
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
