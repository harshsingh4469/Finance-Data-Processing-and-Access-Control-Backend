const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'finance_db';

  if (!mongoUrl) {
    console.error('ERROR: MONGO_URL environment variable is not set.');
    console.error('Set it in your hosting dashboard (e.g. Render > Environment tab).');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUrl, { dbName });
  console.log(`MongoDB connected — DB: ${dbName}`);
};

module.exports = { connectDB };
