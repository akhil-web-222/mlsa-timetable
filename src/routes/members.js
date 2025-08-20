const express = require('express');
const Member = require('../models/Member');
const { memberSubmitSchema } = require('../utils/validation');
const router = express.Router();

// Submit timetable
router.post('/submit', async (req, res) => {
  try {
    const { error, value } = memberSubmitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, reg_number, email, free_slots } = value;

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
        new_slots: free_slots.length 
      }
    };

    if (member) {
      // Update existing member
      member.name = name;
      member.free_slots = free_slots;
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
