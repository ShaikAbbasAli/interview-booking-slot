import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  slotStart: { type: Date, required: true },
  slotEnd: { type: Date, required: true },

  // Company type (MNC / Mid Range / Startup)
  company: {
    type: String,
    required: true,
    maxlength: 25,
  },

  // Round (L1, L2, L3, Manager, Client, HR)
  round: {
    type: String,
    required: true,
    maxlength: 25,
  },

  // Technology (Python, DevOps, ...)
  technology: {
    type: String,
    required: true,
    maxlength: 50,
  },

  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Booking", BookingSchema);
