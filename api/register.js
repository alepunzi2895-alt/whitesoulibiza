const { query, hashPassword, setSession, EMAIL, normalizeEmail, normalizePhone, publicAccount, crypto } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { name, email, phone, password, consent } = req.body || {};
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  if (!String(name || '').trim()) return res.status(400).json({ error: 'name' });
  if (!EMAIL.test(cleanEmail)) return res.status(400).json({ error: 'email' });
  if (String(password || '').length < 8) return res.status(400).json({ error: 'password' });
  if (consent !== true) return res.status(400).json({ error: 'consent' });

  try {
    const existing = await query('SELECT id FROM accounts WHERE email = ?', [cleanEmail]);
    if (existing.length) return res.status(409).json({ error: 'taken' });

    const id = crypto.randomUUID();
    const now = Date.now();
    await query(
      'INSERT INTO accounts (id, name, email, phone, password_hash, created_at, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, String(name).trim().slice(0, 120), cleanEmail, cleanPhone, await hashPassword(String(password)), now, now]
    );
    setSession(res, id);
    return res.status(200).json({ account: publicAccount({ id, name, email: cleanEmail, phone: cleanPhone }) });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
