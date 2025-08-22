const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  day: { type: Number, min: 1, max: 5, required: true },   // 1..5
  slot: { type: Number, min: 1, max: 10, required: true }  // 1..10
}, { _id: false });

// Schema for publicity duty slots with duty type
const PublicitySlotSchema = new mongoose.Schema({
  day: { type: Number, min: 1, max: 5, required: true },   // 1..5
  slot: { type: Number, min: 1, max: 10, required: true }, // 1..10
  duty_type: { type: String, enum: ['C2C', 'HELPDESK'], required: true }
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
  // Publicity duty preferences per Day Order (1-5)
  publicity_duty_preferences: {
    type: Map,
    of: { type: String, enum: ['C2C', 'HELPDESK'] },
    default: {}
  },
  // Assigned publicity slots
  publicity_slots: { type: [PublicitySlotSchema], default: [] },
  locked: { type: Boolean, default: false },  // becomes true on submit
  last_updated: { type: Date, default: Date.now },
  changes_count: { type: Number, default: 0 },
  audit: { type: [AuditSchema], default: [] }
}, { timestamps: true });

MemberSchema.index({ 'free_slots.day': 1, 'free_slots.slot': 1 });
MemberSchema.index({ 'publicity_slots.day': 1, 'publicity_slots.slot': 1, 'publicity_slots.duty_type': 1 });

// Validation: Ensure publicity slots follow rules
MemberSchema.pre('save', function(next) {
  // Check that publicity slots for same day have same duty type
  const dayDutyTypes = {};
  for (const slot of this.publicity_slots) {
    if (dayDutyTypes[slot.day] && dayDutyTypes[slot.day] !== slot.duty_type) {
      return next(new Error(`Cannot mix duty types within Day Order ${slot.day}. All slots must be either C2C or HELPDESK.`));
    }
    dayDutyTypes[slot.day] = slot.duty_type;
  }
  
  // Check minimum 2 slots per day order
  const slotsByDay = {};
  for (const slot of this.publicity_slots) {
    if (!slotsByDay[slot.day]) slotsByDay[slot.day] = 0;
    slotsByDay[slot.day]++;
  }
  
  for (const [day, count] of Object.entries(slotsByDay)) {
    if (count < 2) {
      return next(new Error(`Day Order ${day} requires at least 2 publicity slots (2 hours minimum).`));
    }
  }
  
  next();
});

module.exports = mongoose.model('Member', MemberSchema);
