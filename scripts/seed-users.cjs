// Run: node scripts/seed-users.js
// Generates SQL INSERT statements with bcrypt-hashed passwords.
// Paste output into Turso shell or run via Turso CLI.

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const users = [
  { id: 'usr-aryo', email: 'aryo.ramandito@runsystem.id', name: 'Aryo Ramandito', role: 'admin', password: 'Hasyim@@123' },
  { id: 'usr-budi', email: 'budi@runsystem.id', name: 'Budi', role: 'user', password: 'Hasyim@@123' },
  { id: 'usr-ian', email: 'ian@runsystem.id', name: 'Ian', role: 'user', password: 'Hasyim@@123' },
  { id: 'usr-sales', email: 'sales@runsystem.id', name: 'Sales', role: 'user', password: 'Hasyim@@123' },
  { id: 'usr-sony', email: 'sony@runsystem.id', name: 'Sony', role: 'user', password: 'Hasyim@@123' },
];

async function main() {
  console.log('-- Run this SQL in your Turso shell (turso db shell <db-name>)');
  console.log('');
  console.log('CREATE TABLE IF NOT EXISTS users (');
  console.log('  id TEXT PRIMARY KEY,');
  console.log('  email TEXT UNIQUE NOT NULL,');
  console.log('  name TEXT NOT NULL,');
  console.log('  password_hash TEXT NOT NULL,');
  console.log('  role TEXT DEFAULT \'user\'');
  console.log(');');
  console.log('');
  console.log('DELETE FROM users;');
  console.log('');

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    console.log(`INSERT INTO users (id, email, name, password_hash, role) VALUES ('${u.id}', '${u.email}', '${u.name}', '${hash}', '${u.role}');`);
  }

  console.log('');
  console.log('-- Done! Verify with: SELECT id, email, name, role FROM users;');
}

main().catch(console.error);
