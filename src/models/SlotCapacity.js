const mongoose = require('mongoose');

const SlotCapacitySchema = new mongoose.Schema({
  day: { type: Number, min: 1, max: 5, required: true },   // 1..5
  slot: { type: Number, min: 1, max: 10, required: true }, // 1..10
  duty_type: { type: String, enum: ['C2C', 'HELPDESK'], required: true },
  capacity: { type: Number, min: 1, max: 50, default: 5 }, // Max participants for this slot/duty
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Compound unique index to prevent duplicates
SlotCapacitySchema.index({ day: 1, slot: 1, duty_type: 1 }, { unique: true });

// Update timestamp on save
SlotCapacitySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method to get or create default capacity
SlotCapacitySchema.statics.getCapacity = async function(day, slot, duty_type) {
  let capacity = await this.findOne({ day, slot, duty_type });
  if (!capacity) {
    // Create default capacity if not exists
    capacity = new this({ day, slot, duty_type, capacity: 5 });
    await capacity.save();
  }
  return capacity.capacity;
};

// Static method to get current usage
SlotCapacitySchema.statics.getCurrentUsage = async function(day, slot, duty_type) {
  const Member = mongoose.model('Member');
  const count = await Member.countDocuments({
    'publicity_slots': {
      $elemMatch: { day, slot, duty_type }
    }
  });
  return count;
};

// Static method to check availability
SlotCapacitySchema.statics.getAvailability = async function(day, slot, duty_type) {
  const capacity = await this.getCapacity(day, slot, duty_type);
  const usage = await this.getCurrentUsage(day, slot, duty_type);
  return {
    capacity,
    used: usage,
    available: capacity - usage
  };
};

// Static method to get all slot availabilities for a day
SlotCapacitySchema.statics.getDayAvailability = async function(day) {
  const results = {};
  
  for (let slot = 1; slot <= 10; slot++) {
    results[slot] = {
      C2C: await this.getAvailability(day, slot, 'C2C'),
      HELPDESK: await this.getAvailability(day, slot, 'HELPDESK')
    };
  }
  
  return results;
};

module.exports = mongoose.model('SlotCapacity', SlotCapacitySchema);
