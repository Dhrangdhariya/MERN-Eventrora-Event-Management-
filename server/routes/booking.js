const express = require('express');
const router = express.Router();
const { bookEvent, confirmBooking, getMyBookings, cancelBooking, sendBookingOTP, getOrganizerAnalytics, processUserPayment, finalizePayment, rejectBookingByAdmin, initializeOrder } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.post('/send-otp', protect, sendBookingOTP);
router.post('/', protect, bookEvent);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.get('/my', protect, getMyBookings);
router.delete('/:id', protect, cancelBooking);
router.get('/organizer/analytics', protect, getOrganizerAnalytics);
router.put('/:id/pay', protect, processUserPayment);
router.post('/finalize-payment', protect, finalizePayment);
router.put('/:id/reject', protect, admin, rejectBookingByAdmin);
router.post('/initialize-order', protect, initializeOrder);
router.post('/', protect, bookEvent);

module.exports = router;