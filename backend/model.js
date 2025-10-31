// models.js
import mongoose from 'mongoose';

// Member Schema
const memberSchema = new mongoose.Schema({
  member_code: { type: String, unique: true },
  name: String,
  email: String,
  phone: String,
  role: String,
  balance: { type: Number, default: 0 },
  total_savings: { type: Number, default: 0 },
  debts: { type: Number, default: 0 },
  afterschool: { type: Number, default: 0 },
  loans: { type: Number, default: 0 },
  fines: { type: Number, default: 0 },
  status: { type: String, default: 'approved' }
}, { timestamps: true });

// Savings Schema
const savingSchema = new mongoose.Schema({
  member_code: String,
  amount: Number,
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Fines Schema
const fineSchema = new mongoose.Schema({
  member_code: String,
  amount: Number,
  reason: String,
  paid: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Loans Schema
const loanSchema = new mongoose.Schema({
  member_code: String,
  amount: Number,
  purpose: String,
  reason: String,
  status: { type: String, default: 'pending' },
  due_date: Date
}, { timestamps: true });

// Export models
export const Member = mongoose.model('Member', memberSchema);
export const Saving = mongoose.model('Saving', savingSchema);
export const Fine = mongoose.model('Fine', fineSchema);
export const Loan = mongoose.model('Loan', loanSchema);
