const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'finance_db';

  if (!mongoUrl) {
    console.error('MONGO_URL not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl, { dbName });
  console.log(`MongoDB connected: ${mongoUrl} / ${dbName}`);
};

module.exports = { connectDB };
