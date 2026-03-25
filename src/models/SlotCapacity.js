const mongoose = require('mongoose');
const DUTY_TYPES = ['C2C', 'HELPDESK'];

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
  const availabilityMap = await this.getAvailabilityMap([day]);
  return availabilityMap[day] || {};
};

// Static method to get slot availabilities for multiple days (optimized)
SlotCapacitySchema.statics.getAvailabilityMap = async function(days = [1, 2, 3, 4, 5]) {
  const uniqueDays = [...new Set(days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 5))];
  if (uniqueDays.length === 0) {
    return {};
  }

  const Member = mongoose.model('Member');

  const [capacityDocs, usageDocs] = await Promise.all([
    this.find({ day: { $in: uniqueDays } })
      .select({ _id: 0, day: 1, slot: 1, duty_type: 1, capacity: 1 })
      .lean(),
    Member.aggregate([
      { $unwind: '$publicity_slots' },
      { $match: { 'publicity_slots.day': { $in: uniqueDays } } },
      {
        $group: {
          _id: {
            day: '$publicity_slots.day',
            slot: '$publicity_slots.slot',
            duty_type: '$publicity_slots.duty_type'
          },
          used: { $sum: 1 }
        }
      }
    ])
  ]);

  const capacityMap = new Map();
  for (const doc of capacityDocs) {
    capacityMap.set(`${doc.day}:${doc.slot}:${doc.duty_type}`, doc.capacity);
  }

  const usageMap = new Map();
  for (const doc of usageDocs) {
    usageMap.set(`${doc._id.day}:${doc._id.slot}:${doc._id.duty_type}`, doc.used);
  }

  const results = {};

  for (const day of uniqueDays) {
    results[day] = {};

    for (let slot = 1; slot <= 10; slot++) {
      results[day][slot] = {};

      for (const dutyType of DUTY_TYPES) {
        const key = `${day}:${slot}:${dutyType}`;
        const capacity = capacityMap.has(key) ? capacityMap.get(key) : 5;
        const used = usageMap.has(key) ? usageMap.get(key) : 0;

        results[day][slot][dutyType] = {
          capacity,
          used,
          available: capacity - used
        };
      }
    }
  }

  return results;
};

module.exports = mongoose.model('SlotCapacity', SlotCapacitySchema);
