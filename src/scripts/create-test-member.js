require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');
const connectDB = require('../utils/database');

const createTestMember = async () => {
  try {
    await connectDB();
    
    // Check if test member already exists
    const existingMember = await Member.findOne({ reg_number: 'RA2111003010001' });
    if (existingMember) {
      console.log('Test member already exists:', existingMember.name);
      process.exit(0);
    }
    
    // Create test member
    const testMember = new Member({
      name: 'John Doe',
      reg_number: 'RA2111003010001',
      email: 'john.doe@srmist.edu.in',
      free_slots: [
        { day: 1, slot: 1 },
        { day: 1, slot: 3 },
        { day: 2, slot: 2 },
        { day: 3, slot: 5 },
        { day: 4, slot: 7 }
      ],
      locked: false,
      changes_count: 1,
      audit: [{
        action: 'SUBMIT',
        by: 'member',
        meta: { new_slots: 5 }
      }]
    });
    
    await testMember.save();
    console.log('Test member created successfully!');
    console.log('Registration Number: RA2111003010001');
    console.log('Name: John Doe');
    console.log('Email: john.doe@srmist.edu.in');
    console.log('Free slots: 5 slots selected');
    
  } catch (error) {
    console.error('Error creating test member:', error);
  } finally {
    process.exit(0);
  }
};

createTestMember();
