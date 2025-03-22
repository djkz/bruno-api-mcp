import dotenv from "dotenv";

const parser = (input) => {
  const buf = Buffer.from(input);
  const parsed = dotenv.parse(buf);
  return parsed;
};

export default parser;
