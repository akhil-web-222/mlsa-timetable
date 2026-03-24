require('dotenv').config();

const app = require('../src/app');
const connectDB = require('../src/utils/database');

let isInitialized = false;

module.exports = async (req, res) => {
  try {
    if (!isInitialized) {
      await connectDB();
      isInitialized = true;
    }

    return app(req, res);
  } catch (error) {
    console.error('Serverless initialization error:', error);
    return res.status(500).json({ error: 'Server initialization failed' });
  }
};