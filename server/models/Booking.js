import mongoose from "mongoose";
import { ALL_DESKS } from "../config.js";

const BookingSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  slotStart: { type: Date, required: true },
  slotEnd: { type: Date, required: true },

  company: {
    type: String,
    required: true,
    maxlength: 25,
  },

  round: {
    type: String,
    required: true,
    maxlength: 25,
  },

  technology: {
    type: String,
    required: true,
    maxlength: 50,
  },

  // Dynamic desk validation
  desk: {
    type: String,
    required: true,
    validate: {
      validator: (v) => ALL_DESKS.includes(v),
      message: (props) => `${props.value} is not a valid desk`,
    },
  },

  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Booking", BookingSchema);
