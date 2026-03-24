const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const getMongoUri = () => {
  const directUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();
  if (directUri) {
    return directUri;
  }

  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASS;
  const host = process.env.MONGODB_HOST;
  const dbName = process.env.MONGODB_DB || 'mlsa_timetable';
  const options = process.env.MONGODB_OPTIONS || 'retryWrites=true&w=majority';

  if (!user || !pass || !host) {
    throw new Error(
      'MongoDB config missing. Set MONGODB_URI or MONGODB_USER, MONGODB_PASS, and MONGODB_HOST'
    );
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);

  return `mongodb+srv://${encodedUser}:${encodedPass}@${host}/${dbName}?${options}`;
};

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  const mongoUri = getMongoUri();

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('Database connection error:', error);
    throw error;
  }
};

module.exports = connectDB;
