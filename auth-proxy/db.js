require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // if you ever host on a managed PG that forces SSL, uncomment:
  // ssl: { rejectUnauthorized: false },
});

async function init() {
  // users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // password_resets table (for 6-digit codes)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
init();

// ---- user helpers ----
async function getUserByUsername(username) {
  const res = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  return res.rows[0];
}

async function createUser(username, plainPassword) {
  const hash = await bcrypt.hash(plainPassword, 10);
  const res = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, hash]
  );
  return res.rows[0];
}

async function updateUserPasswordById(userId, newPlainPassword) {
  const hash = await bcrypt.hash(newPlainPassword, 10);
  const res = await pool.query(
    `UPDATE users SET password_hash=$1 WHERE id=$2 RETURNING *`,
    [hash, userId]
  );
  return res.rows[0];
}

// ---- reset helpers ----
async function createPasswordReset(userId, codeHash, expiresAt) {
  const res = await pool.query(
    `INSERT INTO password_resets (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, codeHash, expiresAt]
  );
  return res.rows[0];
}

async function findValidResetForUser(userId) {
  const res = await pool.query(
    `SELECT * FROM password_resets
     WHERE user_id=$1 AND used=false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function markResetUsed(resetId) {
  await pool.query(`UPDATE password_resets SET used=true WHERE id=$1`, [resetId]);
}

module.exports = {
  getUserByUsername,
  createUser,
  updateUserPasswordById,
  createPasswordReset,
  findValidResetForUser,
  markResetUsed,
};
