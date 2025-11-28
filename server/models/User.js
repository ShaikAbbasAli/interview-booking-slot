import mongoose from "mongoose";

const COURSE_LIST = [
  "Python",
  "Java",
  "MERN Stack",
  "DevOps",
  ".Net",
  "CyberArk",
  "Cyber Security",
  "SAP - FICO",
  "SAP - ABAP",
  "SAP - HANA",
  "SAP - BASIS",
  "AI & ML"
];

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

    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    // ⭐ Course must match dropdown values
    course: {
      type: String,
      enum: COURSE_LIST,
      required: true,
    },

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

    // ⭐ User is temporary until OTP verified
    isTemp: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
