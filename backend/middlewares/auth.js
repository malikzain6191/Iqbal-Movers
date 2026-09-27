const jwt = require('jsonwebtoken');

// Runs before every protected route. Reads "Authorization: Bearer <token>",
// verifies it, and attaches the decoded payload to req.user so every
// controller/model downstream can read req.user.id / .role / .city_id / .terminal_id
// without hitting the database again.
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).send({ message: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};
