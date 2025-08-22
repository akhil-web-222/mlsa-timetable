const express = require('express');
const Member = require('../models/Member');
const SlotCapacity = require('../models/SlotCapacity');
const { memberSubmitSchema } = require('../utils/validation');
const router = express.Router();

// Submit timetable
router.post('/submit', async (req, res) => {
  try {
    const { error, value } = memberSubmitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, reg_number, email, free_slots, publicity_duty_preferences, publicity_slots } = value;

    // Validate publicity slots if provided
    if (publicity_slots && publicity_slots.length > 0) {
      // Check capacity constraints
      for (const slot of publicity_slots) {
        const { day, slot: slotNum, duty_type } = slot;
        const availability = await SlotCapacity.getAvailability(day, slotNum, duty_type);
        if (availability.available <= 0) {
          return res.status(400).json({ 
            error: `No available capacity for ${duty_type} on Day ${day}, Slot ${slotNum}` 
          });
        }
      }
    }

    // Check if member already exists
    let member = await Member.findOne({ 
      $or: [{ reg_number }, { email }] 
    });

    if (member && member.locked) {
      return res.status(400).json({ 
        error: 'Submission already locked. Contact admin to unlock.' 
      });
    }

    const auditEntry = {
      action: member ? 'RESUBMIT' : 'SUBMIT',
      by: 'member',
      meta: { 
        previous_slots: member ? member.free_slots.length : 0,
        new_slots: free_slots.length,
        publicity_changes: member ? {
          previous_publicity_slots: member.publicity_slots ? member.publicity_slots.length : 0,
          new_publicity_slots: publicity_slots ? publicity_slots.length : 0
        } : null
      }
    };

    if (member) {
      // Update existing member
      member.name = name;
      member.free_slots = free_slots;
      if (publicity_duty_preferences) {
        member.publicity_duty_preferences = new Map(Object.entries(publicity_duty_preferences));
      }
      if (publicity_slots) {
        member.publicity_slots = publicity_slots;
      }
      member.last_updated = new Date();
      member.changes_count += 1;
      member.audit.push(auditEntry);
      await member.save();
    } else {
      // Create new member
      member = new Member({
        name,
        reg_number,
        email,
        free_slots,
        publicity_duty_preferences: publicity_duty_preferences ? new Map(Object.entries(publicity_duty_preferences)) : new Map(),
        publicity_slots: publicity_slots || [],
        changes_count: 1,
        audit: [auditEntry]
      });
      await member.save();
    }

    res.status(200).json({ 
      message: 'Timetable submitted successfully',
      member: {
        name: member.name,
        reg_number: member.reg_number,
        email: member.email,
        free_slots: member.free_slots,
        publicity_duty_preferences: Object.fromEntries(member.publicity_duty_preferences || new Map()),
        publicity_slots: member.publicity_slots || [],
        locked: member.locked,
        last_updated: member.last_updated
      }
    });

  } catch (error) {
    console.error('Submit error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Registration number or email already exists' 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member by registration number
router.get('/status/:reg_number', async (req, res) => {
  try {
    const member = await Member.findOne({ 
      reg_number: req.params.reg_number 
    }).select('-audit');

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({
      name: member.name,
      reg_number: member.reg_number,
      email: member.email,
      free_slots: member.free_slots,
      publicity_duty_preferences: Object.fromEntries(member.publicity_duty_preferences || new Map()),
      publicity_slots: member.publicity_slots || [],
      locked: member.locked,
      last_updated: member.last_updated,
      changes_count: member.changes_count
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
