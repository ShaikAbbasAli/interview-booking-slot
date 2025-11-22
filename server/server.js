// server/server.js
import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';

import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) { console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set'); return; }

    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hashed = await bcrypt.hash(adminPassword, 10);
      await User.create({ name: 'Admin', email: adminEmail, phone: '-', course: '-', role: 'admin', password: hashed, status: 'approved' });
      console.log('Admin seeded:', adminEmail);
    } else {
      console.log('Admin already exists:', adminEmail);
    }
  } catch (err) {
    console.error('Admin seed error', err);
  }
}

async function start() {
  await connectDB(process.env.MONGO_URI);
  await seedAdmin();
  app.listen(PORT, () => console.log(`Server running ${PORT}`));
}

start();
