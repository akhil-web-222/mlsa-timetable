const express = require('express');
const Member = require('../models/Member');
const SlotCapacity = require('../models/SlotCapacity');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Get availability for all days (public endpoint)
router.get('/availability', async (req, res) => {
  try {
    const availability = {};
    
    for (let day = 1; day <= 5; day++) {
      availability[day] = await SlotCapacity.getDayAvailability(day);
    }
    
    res.json(availability);
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ error: 'Failed to get slot availability' });
  }
});

// Get availability for a specific day
router.get('/availability/:day', async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    if (day < 1 || day > 5) {
      return res.status(400).json({ error: 'Day must be between 1 and 5' });
    }
    
    const availability = await SlotCapacity.getDayAvailability(day);
    res.json(availability);
  } catch (error) {
    console.error('Error getting day availability:', error);
    res.status(500).json({ error: 'Failed to get day availability' });
  }
});

// Get member's publicity assignments
router.get('/member/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json({
      publicity_duty_preferences: member.publicity_duty_preferences,
      publicity_slots: member.publicity_slots
    });
  } catch (error) {
    console.error('Error getting member publicity data:', error);
    res.status(500).json({ error: 'Failed to get member publicity data' });
  }
});

// Validate publicity slot assignment (used by member submission)
router.post('/validate', async (req, res) => {
  try {
    const { publicity_slots, publicity_duty_preferences } = req.body;
    
    // Validate each slot assignment
    for (const slot of publicity_slots) {
      const { day, slot: slotNum, duty_type } = slot;
      
      // Check capacity
      const availability = await SlotCapacity.getAvailability(day, slotNum, duty_type);
      if (availability.available <= 0) {
        return res.status(400).json({ 
          error: `No available capacity for ${duty_type} on Day ${day}, Slot ${slotNum}` 
        });
      }
    }
    
    // Validate duty type consistency per day
    const dayDutyTypes = {};
    for (const slot of publicity_slots) {
      if (dayDutyTypes[slot.day] && dayDutyTypes[slot.day] !== slot.duty_type) {
        return res.status(400).json({ 
          error: `Cannot mix duty types within Day Order ${slot.day}. All slots must be either C2C or HELPDESK.` 
        });
      }
      dayDutyTypes[slot.day] = slot.duty_type;
    }
    
    // Validate minimum 2 slots per day
    const slotsByDay = {};
    for (const slot of publicity_slots) {
      if (!slotsByDay[slot.day]) slotsByDay[slot.day] = 0;
      slotsByDay[slot.day]++;
    }
    
    for (const [day, count] of Object.entries(slotsByDay)) {
      if (count < 2) {
        return res.status(400).json({ 
          error: `Day Order ${day} requires at least 2 publicity slots (2 hours minimum).` 
        });
      }
    }
    
    res.json({ valid: true });
  } catch (error) {
    console.error('Error validating publicity slots:', error);
    res.status(500).json({ error: 'Failed to validate publicity slots' });
  }
});

// ADMIN ROUTES (require authentication)

// Get capacity settings (admin only)
router.get('/admin/capacity', authenticateAdmin, async (req, res) => {
  try {
    const capacities = await SlotCapacity.find().sort({ day: 1, slot: 1, duty_type: 1 });
    res.json(capacities);
  } catch (error) {
    console.error('Error getting capacity settings:', error);
    res.status(500).json({ error: 'Failed to get capacity settings' });
  }
});

// Update capacity for specific slot/duty (admin only)
router.put('/admin/capacity', authenticateAdmin, async (req, res) => {
  try {
    const { day, slot, duty_type, capacity } = req.body;
    
    if (!day || !slot || !duty_type || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (day < 1 || day > 5 || slot < 1 || slot > 10) {
      return res.status(400).json({ error: 'Invalid day or slot range' });
    }
    
    if (!['C2C', 'HELPDESK'].includes(duty_type)) {
      return res.status(400).json({ error: 'Duty type must be C2C or HELPDESK' });
    }
    
    if (capacity < 1 || capacity > 50) {
      return res.status(400).json({ error: 'Capacity must be between 1 and 50' });
    }
    
    const slotCapacity = await SlotCapacity.findOneAndUpdate(
      { day, slot, duty_type },
      { capacity },
      { new: true, upsert: true }
    );
    
    res.json(slotCapacity);
  } catch (error) {
    console.error('Error updating capacity:', error);
    res.status(500).json({ error: 'Failed to update capacity' });
  }
});

// Get publicity statistics (admin only)
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const members = await Member.find({ publicity_slots: { $not: { $size: 0 } } });
    
    const stats = {
      total_members_with_publicity: members.length,
      by_duty_type: { C2C: 0, HELPDESK: 0 },
      by_day: {},
      slot_usage: {}
    };
    
    // Initialize day and slot tracking
    for (let day = 1; day <= 5; day++) {
      stats.by_day[day] = { C2C: 0, HELPDESK: 0 };
      stats.slot_usage[day] = {};
      for (let slot = 1; slot <= 10; slot++) {
        stats.slot_usage[day][slot] = { C2C: 0, HELPDESK: 0 };
      }
    }
    
    // Count assignments
    for (const member of members) {
      for (const slot of member.publicity_slots) {
        stats.by_duty_type[slot.duty_type]++;
        stats.by_day[slot.day][slot.duty_type]++;
        stats.slot_usage[slot.day][slot.slot][slot.duty_type]++;
      }
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting publicity stats:', error);
    res.status(500).json({ error: 'Failed to get publicity statistics' });
  }
});

module.exports = router;
