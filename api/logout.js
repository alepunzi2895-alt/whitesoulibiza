const { clearSession } = require('../lib/server');

module.exports = async (req, res) => {
  clearSession(res);
  return res.status(200).json({ ok: true });
};
