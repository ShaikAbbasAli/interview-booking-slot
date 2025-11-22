import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  slotStart: Date,
  slotEnd: Date,
  company: String,
  round: String,
  approved: { type: Boolean, default: false }, // admin approval not required for booking per your final request; keep for future audit
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', BookingSchema);
