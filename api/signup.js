// POST /api/signup  { name, email, phone, password } → { token, user }
import bcrypt from 'bcryptjs';
import { db, signToken, validate, clean } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const errors = validate(req.body, ['name', 'email', 'phone', 'password']);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const users = (await db()).collection('users');
  const email = clean(req.body.email).toLowerCase();
  if (await users.findOne({ email })) {
    return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'Already registered. Log in instead.' } });
  }

  const user = {
    name: clean(req.body.name),
    email,
    phone: clean(req.body.phone),
    passwordHash: await bcrypt.hash(req.body.password, 10),
    address: '',
    pincode: '',
    role: 'user', // admins are promoted by hand in the database, never through this route
    createdAt: new Date(),
  };
  const { insertedId } = await users.insertOne(user);
  user._id = insertedId;
  delete user.passwordHash;
  res.status(201).json({ token: signToken(user), user });
}
