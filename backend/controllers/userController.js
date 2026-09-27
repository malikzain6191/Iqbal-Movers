const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { logAudit } = require('../utils/audit');
const { isPassword, isPersonName, isPhone, isPositiveId, isUsername, normalizeText } = require('../utils/validation');

const VALID_ROLES = ['super_admin', 'city_admin', 'counter_operator'];

exports.getAllUsers = (req, res) => {
  User.getallusers((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.createUser = (req, res) => {
  const name = normalizeText(req.body.name);
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = req.body.password;
  const phone = String(req.body.phone || '').trim();
  const { role, city_id, terminal_id } = req.body;
  if (!isPersonName(name)) return res.status(400).send({ message: 'Name must contain letters, spaces, apostrophes, or hyphens only' });
  if (!isUsername(username)) return res.status(400).send({ message: 'Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens' });
  if (!isPassword(password)) return res.status(400).send({ message: 'Password must be 8-72 characters and include at least one letter and one number' });
  if (!isPhone(phone)) return res.status(400).send({ message: 'Enter a valid phone number' });
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).send({ message: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (role !== 'super_admin' && !isPositiveId(city_id)) {
    return res.status(400).send({ message: 'A valid city_id is required for city_admin and counter_operator' });
  }
  if (role === 'counter_operator' && !isPositiveId(terminal_id)) {
    return res.status(400).send({ message: 'A valid terminal_id is required for counter_operator' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).send({ error: err });

    User.createuser({
      name, username, password_hash: hash, phone: phone || null,
      role, city_id: role === 'super_admin' ? null : city_id,
      terminal_id: role === 'counter_operator' ? terminal_id : null
    }, (err2, result) => {
      if (err2) return res.status(500).send({ error: err2 });
      if (!result.success && result.reason === 'DUPLICATE') {
        return res.status(409).send({ message: 'Username already exists' });
      }
      logAudit(req.user.id, req.user.name, 'User Modification', 'User', result.insertedId, `Created ${username} (${role})`);
      res.status(201).send({ message: 'User created successfully', userId: result.insertedId });
    });
  });
};

exports.toggleUserStatus = (req, res) => {
  const id = req.params.id;
  if (Number(id) === req.user.id) {
    return res.status(400).send({ message: "You can't deactivate your own account" });
  }

  User.toggleuserstatus(id, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success) return res.status(404).send({ message: 'User not found' });
    logAudit(req.user.id, req.user.name, 'User Modification', 'User', id, `Status → ${result.newStatus}`);
    res.send({ message: 'User status updated', status: result.newStatus });
  });
};
