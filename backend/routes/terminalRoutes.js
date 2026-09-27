const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/terminalController');

router.use(verifyToken);
router.get('/', controller.getAllTerminal);
router.get('/:id', controller.getTerminalByID);
router.post('/', requireRole('super_admin', 'city_admin'), controller.createTerminal);
router.patch('/:id', requireRole('super_admin', 'city_admin'), controller.updateTerminal);
router.delete('/:id', requireRole('super_admin'), controller.deleteTerminal);

module.exports = router;
