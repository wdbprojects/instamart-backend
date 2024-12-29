import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    const { connection } = await mongoose.connect(process.env.MONGODB_URL!);
    if (connection) {
      console.log(`Successfully connected to DB: ${connection.name}`);
    }
  } catch (err: any) {
    console.error(`Error connecting to DB: ${err.message}`);
  }
};

export default connectDB;
