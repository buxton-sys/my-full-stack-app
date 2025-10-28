import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Member' },
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  totalSavings: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  approvedAt: { type: Date },
}, {
  timestamps: true,
});

const Member = mongoose.model('Member', memberSchema);

export default Member;