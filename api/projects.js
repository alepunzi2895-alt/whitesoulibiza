const { query, currentAccount, crypto } = require('../lib/server');

const MAX_DATA = 20000; // characters of saved planner state

module.exports = async (req, res) => {
  try {
    const account = await currentAccount(req);
    if (!account) return res.status(401).json({ error: 'auth' });

    if (req.method === 'GET') {
      const rows = await query(
        'SELECT id, title, data, created_at FROM projects WHERE account_id = ? ORDER BY created_at DESC LIMIT 50',
        [account.id]
      );
      return res.status(200).json({ projects: rows.map(r => ({ id: r.id, title: r.title, data: JSON.parse(r.data), created_at: Number(r.created_at) })) });
    }

    if (req.method === 'POST') {
      const { title, data } = req.body || {};
      const json = JSON.stringify(data || {});
      if (!String(title || '').trim()) return res.status(400).json({ error: 'title' });
      if (json.length > MAX_DATA) return res.status(400).json({ error: 'too_large' });
      const id = crypto.randomUUID();
      const now = Date.now();
      await query(
        'INSERT INTO projects (id, account_id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, account.id, String(title).trim().slice(0, 160), json, now, now]
      );
      return res.status(200).json({ project: { id, title: String(title).trim(), data, created_at: now } });
    }

    if (req.method === 'DELETE') {
      const id = String((req.query && req.query.id) || '');
      await query('DELETE FROM projects WHERE id = ? AND account_id = ?', [id, account.id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method' });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
