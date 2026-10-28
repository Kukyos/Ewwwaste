// GET   /api/pickups           → the logged-in user's pickup requests, newest first
// POST  /api/pickups           { items, size, address, pincode, landmark, lat, lon, date, slot, phone, notes } → new request
// PATCH /api/pickups?id=<id>   { status: "cancelled" } → cancels one of your own requests
import { ObjectId } from 'mongodb';
import { db, requireUser, validate, clean } from './_lib.js';

const ITEMS = ['phone', 'laptop', 'display', 'battery', 'charger', 'cable', 'pcb', 'storage', 'audio', 'lamp', 'peripheral'];
const SIZES = ['small', 'box', 'large'];
const SLOTS = ['9-12', '12-3', '3-6'];

// "YYYY-MM-DD" in India time, `days` from today.
const istDate = (days) => new Date(Date.now() + 5.5 * 3600e3 + days * 864e5).toISOString().slice(0, 10);

export default async function handler(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const pickups = (await db()).collection('pickups');
  const owner = new ObjectId(userId);

  if (req.method === 'GET') {
    const list = await pickups.find({ userId: owner }).sort({ createdAt: -1 }).toArray();
    return res.json({ pickups: list });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const errors = validate(b, ['address', 'pincode', 'phone']);
    const items = Array.isArray(b.items) ? b.items.filter((i) => ITEMS.includes(i)) : [];
    if (!items.length) errors.items = 'Pick at least one item.';
    if (!SIZES.includes(b.size)) errors.size = 'Choose how much you have.';
    if (!SLOTS.includes(b.slot)) errors.slot = 'Choose a time slot.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || b.date < istDate(1) || b.date > istDate(30)) {
      errors.date = 'Pick a date between tomorrow and 30 days from now.';
    }
    const lat = b.lat === null || b.lat === '' || b.lat === undefined ? null : Number(b.lat);
    const lon = b.lon === null || b.lon === '' || b.lon === undefined ? null : Number(b.lon);
    if ((lat !== null && !(Math.abs(lat) <= 90)) || (lon !== null && !(Math.abs(lon) <= 180))) errors.location = 'Location is invalid.';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

    const doc = {
      code: 'EW-' + Date.now().toString(36).toUpperCase(),
      userId: owner,
      items,
      size: b.size,
      address: clean(b.address),
      pincode: clean(b.pincode),
      landmark: clean(b.landmark).slice(0, 100),
      location: lat !== null && lon !== null ? { lat, lon } : null,
      date: b.date,
      slot: b.slot,
      phone: clean(b.phone),
      notes: clean(b.notes).slice(0, 300),
      status: 'scheduled',
      createdAt: new Date(),
    };
    const { insertedId } = await pickups.insertOne(doc);
    return res.status(201).json({ pickup: { ...doc, _id: insertedId } });
  }

  if (req.method === 'PATCH') {
    if (!ObjectId.isValid(req.query.id)) return res.status(400).json({ error: 'Invalid request id.' });
    if (req.body?.status !== 'cancelled') return res.status(400).json({ error: 'Only cancelling is allowed.' });
    // Matching on userId too means nobody can cancel someone else's pickup.
    const result = await pickups.findOneAndUpdate(
      { _id: new ObjectId(req.query.id), userId: owner, status: 'scheduled' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) return res.status(404).json({ error: 'No scheduled pickup with that id.' });
    return res.json({ pickup: result });
  }

  res.status(405).json({ error: 'Use GET, POST or PATCH.' });
}
