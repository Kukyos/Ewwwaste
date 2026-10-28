// Admin only (users with role: "admin").
// GET   /api/admin?status=scheduled   → every pickup (optionally one status) with the customer's name/phone/email, plus totals
// PATCH /api/admin?id=<id>            { status: "completed" | "cancelled" | "scheduled" } → change any pickup's status
import { ObjectId } from 'mongodb';
import { db, requireUser } from './_lib.js';

const STATUSES = ['scheduled', 'completed', 'cancelled'];

export default async function handler(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const database = await db();
  // Check the role in the database on every request, so a demoted admin loses access immediately.
  const me = await database.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
  if (me?.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  const pickups = database.collection('pickups');

  if (req.method === 'GET') {
    const match = STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const [list, counts, users] = await Promise.all([
      pickups.aggregate([
        { $match: match },
        { $sort: { date: 1, slot: 1 } },
        // Join each pickup with the customer who booked it.
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'customer',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }] } },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      ]).toArray(),
      pickups.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
      database.collection('users').countDocuments({ role: { $ne: 'admin' } }),
    ]);
    const totals = { scheduled: 0, completed: 0, cancelled: 0, users };
    for (const c of counts) totals[c._id] = c.count;
    return res.json({ pickups: list, totals });
  }

  if (req.method === 'PATCH') {
    if (!ObjectId.isValid(req.query.id)) return res.status(400).json({ error: 'Invalid request id.' });
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Status must be scheduled, completed or cancelled.' });
    const result = await pickups.findOneAndUpdate(
      { _id: new ObjectId(req.query.id) },
      { $set: { status, [`${status}At`]: new Date(), updatedBy: me._id } },
      { returnDocument: 'after' },
    );
    if (!result) return res.status(404).json({ error: 'No pickup with that id.' });
    return res.json({ pickup: result });
  }

  res.status(405).json({ error: 'Use GET or PATCH.' });
}
