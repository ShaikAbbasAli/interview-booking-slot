import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
        "Only valid Gmail addresses are allowed",
      ],
    },

    phone: String,
    course: String,
    password: { type: String, required: true },

    employee_id: {
      type: String,
      unique: true,
      sparse: true, // allow null before OTP verification
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "removed"],
      default: "pending",
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    otp: String,
    otpExpires: Date,
    otpRequests: { type: [Date], default: [] },

    // ⭐ New field — User stored but not fully active yet
    isTemp: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
