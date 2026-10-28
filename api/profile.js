// GET /api/profile → the logged-in user plus their pickup stats
// PUT /api/profile  { name, phone, address, pincode } → updated user
import { ObjectId } from 'mongodb';
import { db, requireUser, validate, clean } from './_lib.js';

export default async function handler(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const database = await db();
  const users = database.collection('users');
  const _id = new ObjectId(userId);
  const hide = { projection: { passwordHash: 0 } };

  if (req.method === 'GET') {
    const user = await users.findOne({ _id }, hide);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    const pickups = database.collection('pickups');
    const [total, completed, scheduled] = await Promise.all([
      pickups.countDocuments({ userId: _id }),
      pickups.countDocuments({ userId: _id, status: 'completed' }),
      pickups.countDocuments({ userId: _id, status: 'scheduled' }),
    ]);
    return res.json({ user, stats: { total, completed, scheduled } });
  }

  if (req.method === 'PUT') {
    // Address and PIN are optional on the profile, but must be valid if given.
    const fields = ['name', 'phone', ...['address', 'pincode'].filter((f) => clean(req.body?.[f]))];
    const errors = validate(req.body, fields);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

    const update = {
      name: clean(req.body.name),
      phone: clean(req.body.phone),
      address: clean(req.body.address),
      pincode: clean(req.body.pincode),
      updatedAt: new Date(),
    };
    const user = await users.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: 'after', ...hide });
    return res.json({ user });
  }

  res.status(405).json({ error: 'Use GET or PUT.' });
}
