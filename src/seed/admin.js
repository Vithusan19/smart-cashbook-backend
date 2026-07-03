require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_EMAIL = 'vithu0919@gmail.com';
const ADMIN_PASSWORD = 'Vithu1234@';

const seedAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to seed the admin user.');
  }

  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
  if (existing) {
    existing.name = existing.name || 'Vithu Admin';
    existing.password = ADMIN_PASSWORD;
    existing.role = 'admin';
    existing.isVerified = true;
    await existing.save();
    console.log(`Admin user updated: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      name: 'Vithu Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
};

seedAdmin()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
