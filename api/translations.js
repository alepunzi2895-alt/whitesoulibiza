// Serves the translation dictionary for one language. The database token stays
// on the server: the browser only ever receives the texts.
const LANGS = ['EN', 'IT', 'ES', 'FR', 'DE'];

module.exports = async (req, res) => {
  const lang = String((req.query && req.query.lang) || 'EN').toUpperCase();
  if (!LANGS.includes(lang)) return res.status(400).json({ error: 'lang' });

  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_READ_TOKEN || process.env.TURSO_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'config' });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT key, value FROM translations WHERE lang = ?', args: [{ type: 'text', value: lang }] } },
          { type: 'close' },
        ],
      }),
    });
    const data = await response.json();
    const result = data.results[0];
    if (result.type !== 'ok') return res.status(500).json({ error: 'database' });
    const dict = {};
    result.response.result.rows.forEach(row => { dict[row[0].value] = row[1].value; });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ lang, dict });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
