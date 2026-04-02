const router = require('express').Router();
const Record = require('../models/Record');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roles');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Analytics and summary endpoints
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get total income, expenses, and net balance (All authenticated)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalIncome: { type: number }
 *                 totalExpenses: { type: number }
 *                 netBalance: { type: number }
 *                 recordCount: { type: integer }
 *                 incomeCount: { type: integer }
 *                 expenseCount: { type: integer }
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const dateFilter = buildDateFilter(req.query);

    const result = await Record.aggregate([
      { $match: { isDeleted: false, ...dateFilter } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = result.find((r) => r._id === 'income') || { total: 0, count: 0 };
    const expense = result.find((r) => r._id === 'expense') || { total: 0, count: 0 };

    res.json({
      totalIncome: income.total,
      totalExpenses: expense.total,
      netBalance: income.total - expense.total,
      recordCount: income.count + expense.count,
      incomeCount: income.count,
      expenseCount: expense.count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     summary: Get category-wise totals (Analyst and Admin only)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: Filter by type
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category breakdown
 */
router.get('/categories', authenticate, requireRole('analyst', 'admin'), async (req, res) => {
  try {
    const matchFilter = { isDeleted: false };
    if (req.query.type) matchFilter.type = req.query.type;
    Object.assign(matchFilter, buildDateFilter(req.query));

    const result = await Record.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Reshape for convenience
    const categories = {};
    for (const item of result) {
      const { category, type } = item._id;
      if (!categories[category]) categories[category] = { category, income: 0, expense: 0, total: 0, count: 0 };
      categories[category][type] += item.total;
      categories[category].count += item.count;
    }

    const data = Object.values(categories).map((c) => ({
      ...c,
      total: c.income - c.expense,
    }));

    data.sort((a, b) => Math.abs(b.income + b.expense) - Math.abs(a.income + a.expense));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get monthly income vs expense trends (Analyst and Admin only)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, minimum: 1, maximum: 24 }
 *         description: Number of past months to include
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get('/trends', authenticate, requireRole('analyst', 'admin'), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const result = await Record.aggregate([
      { $match: { isDeleted: false, date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build a month-keyed map
    const monthMap = {};
    for (const item of result) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          period: key,
          year: item._id.year,
          month: item._id.month,
          income: 0,
          expense: 0,
          net: 0,
        };
      }
      monthMap[key][item._id.type] = item.total;
    }

    const trends = Object.values(monthMap).map((m) => ({ ...m, net: m.income - m.expense }));
    trends.sort((a, b) => a.period.localeCompare(b.period));

    res.json({ data: trends, months });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /api/dashboard/recent:
 *   get:
 *     summary: Get recent financial activity (All authenticated)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Recent records
 */
router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const records = await Record.find()
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .limit(limit);

    res.json({ data: records });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper: build mongoose date filter from query params
function buildDateFilter(queryParams) {
  const filter = {};
  if (queryParams.startDate || queryParams.endDate) {
    filter.date = {};
    if (queryParams.startDate) filter.date.$gte = new Date(queryParams.startDate);
    if (queryParams.endDate) {
      const end = new Date(queryParams.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  return filter;
}

module.exports = router;
