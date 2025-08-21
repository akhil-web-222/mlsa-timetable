const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  day: { type: Number, min: 1, max: 5, required: true },   // 1..5
  slot: { type: Number, min: 1, max: 10, required: true }  // 1..10
}, { _id: false });

const AuditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  action: { type: String, enum: ['SUBMIT', 'UNLOCK', 'RESUBMIT', 'RESET', 'DELETE'], required: true },
  by: { type: String, enum: ['member', 'admin'], required: true },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  reg_number: { type: String, required: true, trim: true, unique: true, index: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: /^[A-Za-z0-9._%+-]+@srmist\.edu\.in$/ // SRM emails only
  },
  free_slots: { type: [SlotSchema], default: [] },
  locked: { type: Boolean, default: false },  // becomes true on submit
  last_updated: { type: Date, default: Date.now },
  changes_count: { type: Number, default: 0 },
  audit: { type: [AuditSchema], default: [] }
}, { timestamps: true });

MemberSchema.index({ 'free_slots.day': 1, 'free_slots.slot': 1 });

module.exports = mongoose.model('Member', MemberSchema);
