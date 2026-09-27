// Usage: router.post('/', requireRole('super_admin', 'city_admin'), controller.create)
// Must run after verifyToken — it reads req.user, which verifyToken sets.
exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).send({ message: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).send({ message: 'You do not have permission to perform this action' });
  }
  next();
};
