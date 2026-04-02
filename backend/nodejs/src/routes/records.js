const router = require('express').Router();
const { body, query, validationResult } = require('express-validator');
const Record = require('../models/Record');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial records management
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: List financial records with filters and pagination (All authenticated)
 *     tags: [Records]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category (partial match)
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date, example: "2024-01-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date, example: "2024-12-31" }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in description or category
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, category], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of records
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = { $regex: req.query.category, $options: 'i' };
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { category: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const sortField = ['date', 'amount', 'category'].includes(req.query.sortBy) ? req.query.sortBy : 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [records, total] = await Promise.all([
      Record.find(filter)
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Record.countDocuments(filter),
    ]);

    res.json({
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a financial record (Admin only)
 *     tags: [Records]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number, example: 5000, minimum: 0.01 }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string, example: "Salary" }
 *               date: { type: string, format: date, example: "2024-01-15" }
 *               description: { type: string, example: "Monthly salary" }
 *     responses:
 *       201:
 *         description: Record created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
    body('description').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    try {
      const record = await Record.create({ ...req.body, createdBy: req.user._id });
      await record.populate('createdBy', 'name email');
      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     summary: Get a single financial record (All authenticated)
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record found
 *       404:
 *         description: Record not found
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('createdBy', 'name email');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/records/{id}:
 *   put:
 *     summary: Update a financial record (Admin only)
 *     tags: [Records]
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
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Record updated
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    body('amount').optional().isFloat({ min: 0.01 }),
    body('type').optional().isIn(['income', 'expense']),
    body('date').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    try {
      const record = await Record.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate('createdBy', 'name email');
      if (!record) return res.status(404).json({ message: 'Record not found' });
      res.json(record);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     summary: Soft delete a financial record (Admin only)
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted (soft)
 */
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully (soft delete)' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
