const User = require('../models/User');
const Record = require('../models/Record');

const SEED_USERS = [
  { name: 'Admin User', email: 'admin@findata.com', password: 'admin123', role: 'admin' },
  { name: 'Analyst User', email: 'analyst@findata.com', password: 'analyst123', role: 'analyst' },
  { name: 'Viewer User', email: 'viewer@findata.com', password: 'viewer123', role: 'viewer' },
];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pastDate(monthsAgo, day) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day || Math.ceil(Math.random() * 28));
  return d;
}

function buildSeedRecords(adminId) {
  const records = [];

  // 6 months of salary income
  for (let m = 0; m < 6; m++) {
    records.push({ amount: 5000, type: 'income', category: 'Salary', date: pastDate(m, 1), description: 'Monthly salary', createdBy: adminId });
  }

  // Freelance income (occasional)
  records.push({ amount: 1200, type: 'income', category: 'Freelance', date: pastDate(1, 15), description: 'Website project', createdBy: adminId });
  records.push({ amount: 800, type: 'income', category: 'Freelance', date: pastDate(3, 20), description: 'Design work', createdBy: adminId });
  records.push({ amount: 2500, type: 'income', category: 'Investment', date: pastDate(2, 10), description: 'Dividend payout', createdBy: adminId });

  // Monthly rent
  for (let m = 0; m < 6; m++) {
    records.push({ amount: 1500, type: 'expense', category: 'Rent', date: pastDate(m, 3), description: 'Monthly rent', createdBy: adminId });
  }

  // Groceries
  for (let m = 0; m < 6; m++) {
    records.push({ amount: randomBetween(300, 500), type: 'expense', category: 'Groceries', date: pastDate(m, 10), description: 'Weekly groceries', createdBy: adminId });
  }

  // Utilities
  for (let m = 0; m < 4; m++) {
    records.push({ amount: randomBetween(100, 200), type: 'expense', category: 'Utilities', date: pastDate(m, 5), description: 'Electricity & internet', createdBy: adminId });
  }

  // Transport
  for (let m = 0; m < 5; m++) {
    records.push({ amount: randomBetween(150, 300), type: 'expense', category: 'Transport', date: pastDate(m, 12), description: 'Fuel & commute', createdBy: adminId });
  }

  // Entertainment
  records.push({ amount: 150, type: 'expense', category: 'Entertainment', date: pastDate(0, 8), description: 'Streaming subscriptions', createdBy: adminId });
  records.push({ amount: 250, type: 'expense', category: 'Entertainment', date: pastDate(1, 22), description: 'Dining out', createdBy: adminId });
  records.push({ amount: 80, type: 'expense', category: 'Entertainment', date: pastDate(2, 14), description: 'Movie tickets', createdBy: adminId });

  // Healthcare
  records.push({ amount: 350, type: 'expense', category: 'Healthcare', date: pastDate(1, 18), description: 'Doctor visit & meds', createdBy: adminId });
  records.push({ amount: 120, type: 'expense', category: 'Healthcare', date: pastDate(4, 7), description: 'Pharmacy', createdBy: adminId });

  // Savings/Investment
  records.push({ amount: 500, type: 'expense', category: 'Savings', date: pastDate(0, 25), description: 'Monthly savings deposit', createdBy: adminId });
  records.push({ amount: 500, type: 'expense', category: 'Savings', date: pastDate(1, 25), description: 'Monthly savings deposit', createdBy: adminId });

  return records;
}

const seedDatabase = async () => {
  try {
    // Upsert users (don't overwrite if exists - preserve passwords)
    let adminUser = null;
    for (const userData of SEED_USERS) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        const user = await User.create(userData);
        if (userData.role === 'admin') adminUser = user;
        console.log(`Seeded user: ${userData.email} (${userData.role})`);
      } else {
        if (userData.role === 'admin') adminUser = existing;
      }
    }

    // Seed records only if collection is empty
    const recordCount = await Record.countDocuments();
    if (recordCount === 0 && adminUser) {
      const records = buildSeedRecords(adminUser._id);
      await Record.insertMany(records);
      console.log(`Seeded ${records.length} financial records`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = { seedDatabase };
