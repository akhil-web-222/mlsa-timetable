require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = require('./app');
const connectDB = require('./utils/database');
const seedAdmin = require('./scripts/seed');

const PORT = process.env.PORT || 8080;

const initializeApp = async () => {
  try {
    await connectDB();
    console.log('Database connected successfully');

    await seedAdmin();

    const clientBuildPath = path.join(__dirname, '../client/build');
    const indexHtmlPath = path.join(clientBuildPath, 'index.html');

    if (fs.existsSync(indexHtmlPath)) {
      app.use(express.static(clientBuildPath));
      app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(indexHtmlPath);
      });
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      const hasMongoConfig = Boolean(
        (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) ||
        (process.env.MONGODB_USER && process.env.MONGODB_PASS && process.env.MONGODB_HOST)
      );
      console.log(`MongoDB Config: ${hasMongoConfig ? 'Configured' : 'Missing'}`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

initializeApp();

module.exports = app;
