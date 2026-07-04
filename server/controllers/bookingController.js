const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const OTP = require('../models/OTP');
const { sendBookingEmail, sendOTPEmail } = require('../utils/email');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// =========================================================================
// 📩 OTP INITIALIZATION
// =========================================================================
exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOTPEmail(req.user.email, otp, 'event_booking');
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
};

// =========================================================================
// 💳 RAZORPAY PHASE A: GENERATE SECURE ORDER ID
// =========================================================================
exports.initializeOrder = async (req, res) => {
    try {
        const { eventId, otp } = req.body;

        // Verify OTP matches first before communicating with Razorpay
        const validOTP = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
        if (!validOTP) return res.status(400).json({ message: 'Invalid or expired booking OTP' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.availableSeats <= 0) return res.status(400).json({ message: 'Event is fully booked!' });

        // Check for existing duplicate active bookings to avoid dual orders
        const existingBooking = await Booking.findOne({ userId: req.user.id, eventId, status: { $ne: 'cancelled' } });
        if (existingBooking) return res.status(400).json({ message: 'You already have an active booking for this event' });

        // Razorpay values accept currency calculations in smaller sub-units; ₹1 = 100 paise
        const options = {
            amount: event.ticketPrice * 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}_${req.user.id.substring(0, 4)}`
        };

        const order = await razorpayInstance.orders.create(options);

        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        res.status(500).json({ message: 'Order generation failure', error: error.message });
    }
};

// =========================================================================
// 🎫 RAZORPAY PHASE B: VERIFY SIGNATURE AND CAPTURE RESERVATION
// =========================================================================
exports.bookEvent = async (req, res) => {
    try {
        const {
            eventId,
            otp,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify authenticity of signature payload using crypto hashing
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed. Security alert.' });
        }

        const event = await Event.findById(eventId);
        if (!event || event.availableSeats <= 0) {
            return res.status(400).json({ message: 'Seat inventory exhaustion error' });
        }

        // Create an INSTANTLY CONFIRMED & PAID booking because gateway certified it genuine
        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'Razorpay_Gateway',
            amount: event.ticketPrice
        });

        // Safe database seat deduction 
        event.availableSeats -= 1;
        await event.save();

        // Clear verification OTP token record 
        await OTP.deleteOne({ email: req.user.email, action: 'event_booking' });

        // Dispatch email confirmation instantly
        await sendBookingEmail(req.user.email, req.user.name, event.title);

        res.status(201).json({ message: 'Ticket confirmed successfully!', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server confirmation runtime failure', error: error.message });
    }
};

// =========================================================================
// 🛠️ ADMIN & UTILITY METHODS
// =========================================================================
exports.rejectBookingByAdmin = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking folder not found' });

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'This booking is already cancelled or rejected' });
        }

        booking.status = 'cancelled';
        await booking.save();

        const event = await Event.findById(booking.eventId);
        if (event) {
            event.availableSeats += 1;
            await event.save();
        }

        res.json({ message: 'Booking rejected successfully by admin. Seat restored.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error handling rejection', error: error.message });
    }
};

exports.confirmBooking = async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        const booking = await Booking.findById(req.params.id).populate('eventId');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'confirmed') return res.status(400).json({ message: 'Booking is already confirmed' });

        const event = await Event.findById(booking.eventId._id);
        if (event.availableSeats <= 0) {
            return res.status(400).json({ message: 'No seats available to confirm this booking' });
        }

        booking.status = 'confirmed';
        if (paymentStatus) {
            booking.paymentStatus = paymentStatus;
        }
        await booking.save();

        event.availableSeats -= 1;
        await event.save();

        await sendBookingEmail(booking.userId.email, booking.userId.name, booking.eventId.title);

        res.json({ message: 'Booking confirmed successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = req.user.role === 'admin'
            ? await Booking.find().populate('eventId').populate('userId', 'name email').sort({ createdAt: -1 })
            : await Booking.find({ userId: req.user.id }).populate('eventId').sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

        const wasConfirmed = booking.status === 'confirmed';

        booking.status = 'cancelled';
        await booking.save();

        if (wasConfirmed) {
            const event = await Event.findById(booking.eventId);
            if (event) {
                event.availableSeats += 1;
                await event.save();
            }
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// =========================================================================
// 💳 ALTERNATIVE OPTION: STRIPE PAYMENTS
// =========================================================================
exports.processUserPayment = async (req, res) => {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const booking = await Booking.findById(req.params.id).populate('eventId');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `http://localhost:3000/payment-success?bookingId=${booking._id}`,
            cancel_url: `http://localhost:3000/payment-failed`,
            customer_email: req.user.email,
            client_reference_id: booking._id.toString(),
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: booking.eventId.title,
                            description: `Ticket reservation for Eventora`,
                        },
                        unit_amount: booking.amount * 100,
                    },
                    quantity: 1,
                },
            ],
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ message: 'Stripe Session Failed', error: error.message });
    }
};

exports.finalizePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Target reservation file not found' });

        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Action unauthorized for this account instance' });
        }

        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'This reservation invoice has already been cleared' });
        }

        booking.paymentStatus = 'paid';
        await booking.save();

        res.status(200).json({ message: 'Payment tracking validated successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error processing confirmation processing', error: error.message });
    }
};

// =========================================================================
// 📊 ORGANIZER DASHBOARD & ANALYTICS DATA PIPELINE
// =========================================================================
exports.getOrganizerAnalytics = async (req, res) => {
    try {
        // Ensure the accessing account is an authorized host/admin
        if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
            return res.status(430).json({ message: 'Access denied. Organizers only.' });
        }

        // 1. Calculate General High-Level Financial Metrics
        const financialMetrics = await Booking.aggregate([
            { $match: { status: 'confirmed', paymentStatus: 'paid' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalTicketsSold: { $sum: 1 }
                }
            }
        ]);

        const stats = financialMetrics[0] || { totalRevenue: 0, totalTicketsSold: 0 };

        // 2. Track Sales Velocity (Tickets bought grouped by Day for graph charting)
        const salesVelocity = await Booking.aggregate([
            { $match: { status: 'confirmed', paymentStatus: 'paid' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    ticketsCount: { $sum: 1 },
                    revenueGenerated: { $sum: '$amount' }
                }
            },
            { $sort: { "_id": 1 } }, // Chronological order
            { $limit: 30 } // Last 30 active trading days
        ]);

        // 3. Populate Live Event Performance Tracking Records
        const eventPerformance = await Event.find()
            .select('title totalSeats availableSeats ticketPrice date')
            .lean();

        const formattedPerformance = eventPerformance.map(event => {
            const sold = event.totalSeats - event.availableSeats;
            return {
                id: event._id,
                title: event.title,
                date: event.date,
                seatsSold: sold,
                totalCapacity: event.totalSeats,
                revenue: sold * event.ticketPrice
            };
        });

        res.status(200).json({
            summary: {
                totalRevenue: stats.totalRevenue,
                totalTicketsSold: stats.totalTicketsSold,
                activeEventsCount: eventPerformance.length
            },
            salesVelocity,
            eventPerformance: formattedPerformance
        });
    } catch (error) {
        res.status(500).json({ message: 'Error aggregating system data maps', error: error.message });
    }
};