// Creates an admin account, or promotes an existing one and resets its password.
// Usage: node --env-file=.env scripts/make-admin.mjs <email> <password> ["Full Name"]
import dns from 'node:dns';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

dns.setServers(['8.8.8.8', '1.1.1.1']); // same SRV workaround as the dev server

const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node --env-file=.env scripts/make-admin.mjs <email> <password> ["Full Name"]');
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const users = client.db('ewaste').collection('users');
const result = await users.updateOne(
  { email: email.toLowerCase() },
  {
    $set: { role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
    $setOnInsert: { name, phone: '', address: '', pincode: '', createdAt: new Date() },
  },
  { upsert: true },
);
console.log(result.upsertedCount ? `Created admin ${email}` : `Promoted ${email} to admin`);
await client.close();
