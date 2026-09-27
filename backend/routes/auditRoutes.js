const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/auditController');

router.use(verifyToken, requireRole('super_admin', 'city_admin'));
router.get('/', controller.getAuditLogs);

module.exports = router;
