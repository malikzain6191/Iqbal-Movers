const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const controller = require('../controllers/cityController');

router.use(verifyToken);
router.get('/', controller.getAllCity);
router.get('/:id', controller.getCityByID);
router.post('/', requireRole('super_admin'), controller.createCity);
router.patch('/:id', requireRole('super_admin'), controller.updateCity);
router.delete('/:id', requireRole('super_admin'), controller.deleteCity);

module.exports = router;
