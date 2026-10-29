const { query, verifyPassword, setSession, normalizeEmail, normalizePhone, publicAccount } = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { identifier, password } = req.body || {};
  const value = String(identifier || '').trim();
  // An identifier with an @ is an email, anything else is matched as a phone number
  const isEmail = value.includes('@');

  try {
    const rows = isEmail
      ? await query('SELECT * FROM accounts WHERE email = ?', [normalizeEmail(value)])
      : await query('SELECT * FROM accounts WHERE phone = ?', [normalizePhone(value)]);
    const account = rows[0];
    if (!account || !account.password_hash || !(await verifyPassword(String(password || ''), account.password_hash))) {
      return res.status(401).json({ error: 'invalid' });
    }
    setSession(res, account.id);
    return res.status(200).json({ account: publicAccount(account) });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
