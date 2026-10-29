const { currentAccount, publicAccount } = require('../lib/server');

module.exports = async (req, res) => {
  try {
    const account = await currentAccount(req);
    return res.status(200).json({ account: account ? publicAccount(account) : null });
  } catch (err) {
    return res.status(500).json({ error: 'server' });
  }
};
