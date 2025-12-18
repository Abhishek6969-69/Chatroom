import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export function verifyToken(token:any) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret') as jwt.JwtPayload;
    return payload.userId; // userId from the token payload
  } catch (err) {
    return null;
  }
}
