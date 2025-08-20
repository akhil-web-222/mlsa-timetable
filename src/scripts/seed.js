require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const connectDB = require('../utils/database');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    const username = process.env.ADMIN_SEED_USERNAME || 'admin';
    const password = process.env.ADMIN_SEED_PASSWORD || 'StrongPass';
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
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
  } finally {
    process.exit(0);
  }
};

seedAdmin();
