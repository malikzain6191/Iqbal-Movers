const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { logAudit } = require('../utils/audit');

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send({ message: 'Username and password are required' });

  User.finduserbyusername(username, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    if (results.length === 0) return res.status(401).send({ message: 'Username or password incorrect' });

    const user = results[0];
    if (user.status !== 'Active') return res.status(401).send({ message: 'This account is inactive' });

    bcrypt.compare(password, user.password_hash, (err2, match) => {
      if (err2) return res.status(500).send({ error: err2 });
      if (!match) return res.status(401).send({ message: 'Username or password incorrect' });

      const payload = { id: user.id, name: user.name, role: user.role, city_id: user.city_id, terminal_id: user.terminal_id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

      logAudit(user.id, user.name, 'Login', 'User', user.id, user.username);
      res.json({ token, user: payload });
    });
  });
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};
