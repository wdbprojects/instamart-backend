import express from "express";
import connectDB from "./config/connectDB";

const app = express();

app.get("/", (req, res, next) => {
  res.status(200).json({ message: "healthy check" });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT, async () => {
      console.log(`Server running on port ${process.env.PORT}...`);
    });
  } catch (err: any) {
    console.error(`Error with server: ${err.message}`);
  }
};

startServer();
