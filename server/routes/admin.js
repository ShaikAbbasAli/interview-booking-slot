// server/routes/admin.js
import express from 'express';
import auth from '../middleware/auth.js';
import role from '../middleware/role.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { notifyStudentApproved } from "../server.js";


const router = express.Router();

// admin: list students
router.get("/students", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin only" });
  }

  const users = await User.find({
    role: "student",
    emailVerified: true,   // ⭐ Only verified students
    isTemp: false          // ⭐ Prevent pending accounts
  }).select("-password -otp -otpExpires -otpRequests");

  res.json(users);
});

// admin: approve student
router.put('/students/:id/approve', auth, role('admin'), async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student) return res.status(404).json({ msg: 'Student not found' });

  student.status = 'approved';
  await student.save();

  // 🔥 WebSocket broadcast
  notifyStudentApproved(student._id.toString());

  res.json({ msg: 'Student approved', student });
});


// admin: remove student (delete user + bookings)
router.delete('/students/:id', auth, role('admin'), async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student) return res.status(404).json({ msg: 'Student not found' });
  await Booking.deleteMany({ student: student._id });
  await User.findByIdAndDelete(student._id);
  res.json({ msg: 'Student removed' });
});

// admin: view all bookings (optional)
router.get('/bookings', auth, role('admin'), async (req, res) => {
  const list = await Booking.find().populate('student','name email phone course status').sort({ slotStart: 1 }).lean();
  res.json(list);
});

export default router;
