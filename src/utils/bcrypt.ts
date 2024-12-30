import bcrypt from "bcryptjs";

export const hashValue = async (value: string, saltRounds?: number) => {
  return await bcrypt.hash(value, saltRounds || 10);
};

export const compareValue = async (value: string, hashedValue: string) => {
  return await bcrypt.compare(value, hashedValue).catch(() => {
    return false;
  });
};
