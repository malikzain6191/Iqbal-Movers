const router = require('express').Router();
const { verifyToken } = require('../middlewares/auth');
const controller = require('../controllers/bookingController');

router.use(verifyToken);
router.post('/', controller.createBooking);
router.get('/', controller.listBookings);
router.post('/:id/cancel', controller.cancelBooking);

module.exports = router;
