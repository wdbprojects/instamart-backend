import mongoose from "mongoose";
const { Schema } = mongoose;
import { compareValue, hashValue } from "../utils/bcrypt";

const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

export interface UserDocument extends mongoose.Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(val: string): Promise<boolean>;
  omitPassword(): Pick<
    UserDocument,
    | "_id"
    | "firstName"
    | "lastName"
    | "email"
    | "verified"
    | "createdAt"
    | "updatedAt"
    | "__v"
  >;
  __v: number;
}

const userSchema = new Schema<UserDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [regex, "Please fill a valid email address"],
    },
    password: {
      type: String,
      required: true,
      min: [8, "Password at least 8 characters"],
      max: [24, "Password not more than 24 characters"],
    },
    verified: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hashValue(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (val: string) {
  return await compareValue(val, this.password);
};

userSchema.methods.omitPassword = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
