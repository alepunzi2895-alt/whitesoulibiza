// Shared helpers for the account API (Vercel serverless functions).
// No dependencies: Node's crypto for password hashing and session signing,
// fetch for the Turso HTTP API. Secrets come from environment variables.
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const COOKIE = 'ws_session';

// ---- Turso ---------------------------------------------------------------
function toArg(value) {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') return { type: 'integer', value: String(Math.trunc(value)) };
  return { type: 'text', value: String(value) };
}

async function query(sql, args = []) {
  const res = await fetch(process.env.TURSO_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(toArg) } }, { type: 'close' }] }),
  });
  const data = await res.json();
  const result = data.results[0];
  if (result.type !== 'ok') throw new Error(result.error?.message || 'database error');
  const { cols, rows } = result.response.result;
  return rows.map(row => Object.fromEntries(cols.map((c, i) => [c.name, row[i].value === undefined ? null : row[i].value])));
}

// ---- Passwords -----------------------------------------------------------
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, salt, hex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

// ---- Sessions (signed cookie, no server-side state) -----------------------
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function unsign(token) {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  return payload.exp > Date.now() ? payload : null;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function setSession(res, accountId) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const token = sign({ uid: accountId, exp });
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

// Returns the logged-in account row, or null
async function currentAccount(req) {
  const session = unsign(readCookie(req, COOKIE));
  if (!session) return null;
  const rows = await query('SELECT id, name, email, phone FROM accounts WHERE id = ?', [session.uid]);
  return rows[0] || null;
}

// ---- Validation -----------------------------------------------------------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function publicAccount(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone };
}

module.exports = {
  query, hashPassword, verifyPassword, setSession, clearSession, currentAccount,
  EMAIL, normalizeEmail, normalizePhone, publicAccount, crypto,
};
