const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.error('ERROR: MONGO_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUrl);
  console.log(`MongoDB connected successfully`);
};

module.exports = { connectDB };
