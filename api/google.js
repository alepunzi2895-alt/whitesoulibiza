const { query, setSession, normalizeEmail, publicAccount, crypto } = require('../lib/server');

// Verifies a Google ID token (from Google Identity Services) with Google's
// tokeninfo endpoint and checks that it was issued for our client ID.
async function verifyGoogle(credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) return null;
  const info = await res.json();
  if (info.aud !== process.env.GOOGLE_CLIENT_ID) return null;
  if (info.email_verified !== 'true' && info.email_verified !== true) return null;
  return { sub: info.sub, email: normalizeEmail(info.email), name: info.name || info.email };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'credential' });

  try {
    const google = await verifyGoogle(String(credential));
    if (!google) return res.status(401).json({ error: 'invalid' });

    let rows = await query('SELECT * FROM accounts WHERE google_id = ?', [google.sub]);
    if (!rows.length) rows = await query('SELECT * FROM accounts WHERE email = ?', [google.email]);
    let account = rows[0];

    if (account) {
      if (!account.google_id) await query('UPDATE accounts SET google_id = ? WHERE id = ?', [google.sub, account.id]);
    } else {
      const id = crypto.randomUUID();
      const now = Date.now();
      await query(
        'INSERT INTO accounts (id, name, email, phone, google_id, created_at, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, google.name.slice(0, 120), google.email, '', google.sub, now, now]
      );
      account = { id, name: google.name, email: google.email, phone: '' };
    }
    setSession(res, account.id);
    return res.status(200).json({ account: publicAccount(account) });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
