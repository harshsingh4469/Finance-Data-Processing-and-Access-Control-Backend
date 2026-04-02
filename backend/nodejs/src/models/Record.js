const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be positive'],
    },
    type: {
      type: String,
      enum: { values: ['income', 'expense'], message: 'Type must be income or expense' },
      required: [true, 'Type is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 100,
    },
    date: { type: Date, required: [true, 'Date is required'] },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Default filter: exclude soft-deleted records (Mongoose v8: no next in query middleware)
recordSchema.pre(/^find/, function () {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
});

recordSchema.index({ type: 1, category: 1, date: -1 });

module.exports = mongoose.model('Record', recordSchema);
