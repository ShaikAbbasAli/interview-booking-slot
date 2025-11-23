import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  slotStart: { type: Date, required: true },
  slotEnd: { type: Date, required: true },

  company: {
    type: String,
    required: true,
    maxlength: 25  // ⬅ LIMIT to 25 characters
  },

  round: {
    type: String,
    required: true,
    maxlength: 25  // ⬅ LIMIT to 25 characters
  },

  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', BookingSchema);
