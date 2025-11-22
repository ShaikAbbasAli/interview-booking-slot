import mongoose from 'mongoose';

const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Error:", err);
  }
};

export default connectDB;
