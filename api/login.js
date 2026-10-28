// POST /api/login  { email, password } → { token, user }
import bcrypt from 'bcryptjs';
import { db, signToken, clean } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const email = clean(req.body?.email).toLowerCase();
  const password = req.body?.password || '';
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });

  const user = await (await db()).collection('users').findOne({ email });
  // Same message for unknown email and wrong password, so attackers can't probe which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  delete user.passwordHash;
  res.json({ token: signToken(user), user });
}
