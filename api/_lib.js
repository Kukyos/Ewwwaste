// Shared backend helpers: MongoDB connection, JWT auth and input validation.
// Files starting with "_" are not exposed as routes by Vercel.
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// Reuse one connection across requests while the serverless function stays warm.
let clientPromise;
export async function db() {
  clientPromise ??= new MongoClient(process.env.MONGODB_URI).connect().catch((err) => {
    clientPromise = null; // let the next request try again
    throw err;
  });
  return (await clientPromise).db('ewaste');
}

export const signToken = (user) => jwt.sign({ sub: user._id.toString(), email: user.email }, SECRET, { expiresIn: '7d' });

// Reads "Authorization: Bearer <token>". Returns the user id, or sends 401 and returns null.
export function requireUser(req, res) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    return jwt.verify(token, SECRET).sub;
  } catch {
    res.status(401).json({ error: 'Please log in again.' });
    return null;
  }
}

// ---------- Validation (the browser validates too, but the server never trusts it) ----------
export const RULES = {
  name: (v) => /^[A-Za-z .'-]{2,60}$/.test(v) || 'Name must be 2–60 letters.',
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.',
  password: (v) => (v.length >= 8 && /\d/.test(v) && /[A-Za-z]/.test(v)) || 'Password needs 8+ characters with a letter and a number.',
  phone: (v) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^\+91/, '')) || 'Enter a 10-digit Indian mobile number.',
  address: (v) => (v.length >= 10 && v.length <= 300) || 'Address must be 10–300 characters.',
  pincode: (v) => /^\d{6}$/.test(v) || 'PIN code must be 6 digits.',
};

// Checks the given fields of `body` against RULES. Returns { field: message } for each failure.
export function validate(body, fields) {
  const errors = {};
  for (const f of fields) {
    const v = typeof body?.[f] === 'string' ? body[f].trim() : '';
    const ok = v ? RULES[f](v) : 'This field is required.';
    if (ok !== true) errors[f] = ok;
  }
  return errors;
}

export const clean = (s) => (typeof s === 'string' ? s.trim() : '');
