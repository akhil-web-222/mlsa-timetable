const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const Member = require('../models/Member');
const { generateTokens, setTokenCookies, clearTokenCookies } = require('../utils/jwt');
const { authenticateAdmin } = require('../middleware/auth');
const { adminLoginSchema, adminMembersQuerySchema, exportQuerySchema } = require('../utils/validation');
const csv = require('fast-csv');
const { SLOT_LABELS, DAY_LABELS } = require('../utils/constants');
const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = adminLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = value;
    const admin = await Admin.findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: admin._id,
      username: admin.username,
      role: admin.role
    });

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      admin: {
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  clearTokenCookies(res);
  res.json({ message: 'Logout successful' });
});

// Get all members with filtering and pagination
router.get('/members', authenticateAdmin, async (req, res) => {
  try {
    const { error, value } = adminMembersQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { search, day, slot, locked, page, limit } = value;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { reg_number: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (typeof locked !== 'undefined') {
      query.locked = locked;
    }
    
    if (day && slot) {
      query.free_slots = {
        $elemMatch: { day, slot }
      };
    }

    const [members, total] = await Promise.all([
      Member.find(query)
        .select('-audit')
        .sort({ last_updated: -1 })
        .skip(skip)
        .limit(limit),
      Member.countDocuments(query)
    ]);

    res.json({
      members,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        per_page: limit
      }
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member details with audit log
router.get('/members/:id', authenticateAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(member);

  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlock member for re-submission
router.patch('/members/:id/unlock', authenticateAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    member.locked = false;
    member.audit.push({
      action: 'UNLOCK',
      by: 'admin',
      meta: { admin_username: req.admin.username }
    });
    
    await member.save();

    res.json({ 
      message: 'Member unlocked successfully',
      member: {
        id: member._id,
        name: member.name,
        locked: member.locked
      }
    });

  } catch (error) {
    console.error('Unlock member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete member
router.delete('/members/:id', authenticateAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Add audit log before deletion
    member.audit.push({
      action: 'DELETE',
      by: 'admin',
      meta: { admin_username: req.admin.username }
    });
    
    await member.save();
    
    // Now delete the member
    await Member.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Member deleted successfully',
      deleted_member: {
        id: req.params.id,
        name: member.name,
        reg_number: member.reg_number
      }
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset member's free slots
router.patch('/members/:id/reset', authenticateAdmin, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Clear all free slots
    member.free_slots = [];
    member.locked = false;
    member.last_updated = new Date();
    member.audit.push({
      action: 'RESET',
      by: 'admin',
      meta: { admin_username: req.admin.username }
    });
    
    await member.save();

    res.json({ 
      message: 'Member data reset successfully',
      member: {
        id: member._id,
        name: member.name,
        free_slots: member.free_slots,
        locked: member.locked
      }
    });

  } catch (error) {
    console.error('Reset member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export data as CSV
router.get('/export/csv', authenticateAdmin, async (req, res) => {
  try {
    const { error, value } = exportQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { scope, day } = value;
    const members = await Member.find({}).select('-audit');

    const filename = scope === 'all' 
      ? `timetable_export_${new Date().toISOString().split('T')[0]}.csv`
      : `timetable_day${day}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const csvStream = csv.format({ headers: true });
    csvStream.pipe(res);

    if (scope === 'all') {
      // Export all member data with slot details
      members.forEach(member => {
        member.free_slots.forEach(slot => {
          csvStream.write({
            name: member.name,
            registration: member.reg_number,
            email: member.email,
            day: `Day ${slot.day}`,
            slot: `Slot ${slot.slot}`,
            time: SLOT_LABELS[slot.slot - 1],
            locked: member.locked ? 'Yes' : 'No',
            last_updated: member.last_updated.toISOString()
          });
        });
      });
    } else {
      // Export specific day
      const headers = ['Name', 'Registration', 'Email', ...SLOT_LABELS];
      
      members.forEach(member => {
        const row = {
          'Name': member.name,
          'Registration': member.reg_number,
          'Email': member.email
        };
        
        SLOT_LABELS.forEach((label, index) => {
          const slotNum = index + 1;
          const hasSlot = member.free_slots.some(slot => slot.day === day && slot.slot === slotNum);
          row[label] = hasSlot ? 'FREE' : '';
        });
        
        csvStream.write(row);
      });
    }

    csvStream.end();

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalMembers, lockedMembers, recentSubmissions] = await Promise.all([
      Member.countDocuments({}),
      Member.countDocuments({ locked: true }),
      Member.countDocuments({ 
        last_updated: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        } 
      })
    ]);

    // Slot availability statistics
    const slotStats = {};
    for (let day = 1; day <= 5; day++) {
      slotStats[`day${day}`] = {};
      for (let slot = 1; slot <= 10; slot++) {
        const count = await Member.countDocuments({
          free_slots: { $elemMatch: { day, slot } }
        });
        slotStats[`day${day}`][`slot${slot}`] = count;
      }
    }

    res.json({
      total_members: totalMembers,
      locked_members: lockedMembers,
      unlocked_members: totalMembers - lockedMembers,
      recent_submissions: recentSubmissions,
      slot_availability: slotStats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
