require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    const username = process.env.ADMIN_SEED_USERNAME || 'admin';
    const password = process.env.ADMIN_SEED_PASSWORD || 'StrongPass';
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create admin
    const admin = new Admin({
      username,
      password_hash,
      role: 'admin'
    });
    
    await admin.save();
    console.log(`Admin user created successfully: ${username}`);
    console.log(`Password: ${password}`);
    console.log('Please change the default password after first login');
    
  } catch (error) {
    console.error('Error seeding admin:', error);
    throw error;
  }
};

// If this file is run directly, execute the seeding
if (require.main === module) {
  const connectDB = require('../utils/database');
  
  const runSeeding = async () => {
    try {
      await connectDB();
      await seedAdmin();
    } catch (error) {
      console.error('Seeding failed:', error);
    } finally {
      process.exit(0);
    }
  };
  
  runSeeding();
}

module.exports = seedAdmin;
