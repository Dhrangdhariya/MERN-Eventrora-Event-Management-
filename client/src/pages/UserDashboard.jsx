import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaTimesCircle } from 'react-icons/fa';

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    // Add these hooks at the top of your UserDashboard component function
    const [activeBooking, setActiveBooking] = useState(null);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentStep, setPaymentStep] = useState('form'); // 'form' | 'success' | 'error'

    const handlePayNowClick = (booking) => {
        setActiveBooking(booking);
        setPaymentStep('form');
        setIsPayModalOpen(true);
    };

    const executeMockPayment = async (e) => {
        e.preventDefault();
        setPaymentProcessing(true);

        try {
            // 1. Fire update request to your backend confirmation route
            await api.post('/bookings/finalize-payment', { bookingId: activeBooking._id });

            // 2. Shift view layout step to match animated checkmark state
            setPaymentStep('success');

            // 3. Refresh the parent collection grid view dynamically if hook exists
            if (typeof fetchMyBookings === 'function') fetchMyBookings();
            else if (typeof fetchBookings === 'function') fetchBookings();
        } catch (err) {
            console.error("Payment registration failure: ", err);
            setPaymentStep('error');
        } finally {
            setPaymentProcessing(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchBookings();
    }, [user, navigate]);

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/my');
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings', error);
        } finally {
            setLoading(false);
        }
    };

    const cancelBooking = async (id) => {
        if (window.confirm('Are you sure you want to cancel this booking request?')) {
            try {
                await api.delete(`/bookings/${id}`);
                fetchBookings();
            } catch (error) {
                alert(error.response?.data?.message || 'Error cancelling booking');
            }
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-8 border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
                <div className="w-20 h-20 bg-gray-200 text-gray-900 rounded-full flex items-center justify-center text-3xl font-bold uppercase tracking-widest shrink-0">
                    {user?.name.charAt(0)}
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Welcome, {user?.name}!</h1>
                    <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> User Dashboard
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                    <FaTicketAlt className="text-gray-700" /> My Bookings requests
                </h2>
            </div>

            {bookings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTicketAlt className="text-gray-300 text-3xl" />
                    </div>
                    <p className="text-xl text-gray-500 mb-6 mt-4 font-medium">You haven't booked any events yet.</p>
                    <Link to="/" className="inline-block bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-lg transition shadow-md">
                        Browse Events
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col">
                            <div className="p-6 border-b border-gray-50 flex-grow">
                                {booking.eventId ? (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{booking.eventId.title}</h3>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                                {booking.status !== 'cancelled' && (
                                                    <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.paymentStatus === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {booking.paymentStatus.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 mb-4 space-y-1">
                                            <p><strong className="text-gray-700">Date:</strong> {new Date(booking.eventId.date).toLocaleDateString()}</p>
                                            <p><strong className="text-gray-700">Amount:</strong> {booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</p>
                                            <p><strong className="text-gray-700">Requested:</strong> {new Date(booking.bookedAt).toLocaleDateString()}</p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-red-500 italic">Event details unavailable (might have been deleted)</p>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 flex justify-between items-center shrink-0">
                                {booking.eventId && booking.status !== 'cancelled' ? (
                                    <>
                                        <div className="flex items-center gap-4">
                                            {/* 🛡️ Fixed with optional chaining (?.) to prevent app crashing */}
                                            <Link to={`/events/${booking.eventId?._id}`} className="text-gray-900 font-semibold text-sm hover:underline">
                                                View Event
                                            </Link>

                                            {/* RENDER PAY NOW BUTTON HERE */}
                                            {booking.status === 'confirmed' && booking.paymentStatus === 'not_paid' && booking.amount > 0 && (
                                                <button
                                                    onClick={() => handlePayNowClick(booking)}
                                                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-1.5 px-4 rounded transition tracking-wide shadow-sm"
                                                >
                                                    Pay Now
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => cancelBooking(booking._id)}
                                            className="text-red-500 font-semibold text-sm hover:text-red-700 transition flex items-center gap-1"
                                        >
                                            <FaTimesCircle /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full text-center text-sm text-gray-500 italic">Booking Cancelled</div>
                                )}
                            </div>
                            {/* start */}
                            {/* REALISTIC CHECKOUT OVERLAY MODAL */}
                            {isPayModalOpen && activeBooking && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transition-all transform scale-100">

                                        {/* STEP A: SECURE CARDFORM ENTRY VIEW */}
                                        {paymentStep === 'form' && (
                                            <form onSubmit={executeMockPayment}>
                                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                    <div>
                                                        <h3 className="text-lg font-black text-gray-900">Secure Checkout</h3>
                                                        <p className="text-xs text-gray-500 font-medium">Event: {activeBooking.eventId?.title}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsPayModalOpen(false)}
                                                        className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                                                    >✕</button>
                                                </div>

                                                <div className="p-6 space-y-4">
                                                    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-inner flex justify-between items-center">
                                                        <span className="text-sm font-semibold tracking-wide text-gray-400">Total Payable Amount:</span>
                                                        <span className="text-xl font-black">₹{activeBooking.amount}</span>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Cardholder Name</label>
                                                        <input type="text" required placeholder="John Doe" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 outline-none" />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Card Number</label>
                                                        <div className="relative">
                                                            <input type="text" required maxLength="19" placeholder="4242 4242 4242 4242" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 outline-none font-mono tracking-widest" />
                                                            <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 tracking-tighter">VISA / MC</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Expiry Date</label>
                                                            <input type="text" required maxLength="5" placeholder="MM/YY" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 outline-none text-center font-mono" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">CVV Code</label>
                                                            <input type="password" required maxLength="3" placeholder="•••" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 outline-none text-center font-mono" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={paymentProcessing}
                                                        onClick={() => setIsPayModalOpen(false)}
                                                        className="w-1/3 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-xl transition"
                                                    >Cancel</button>
                                                    <button
                                                        type="submit"
                                                        disabled={paymentProcessing}
                                                        className="w-2/3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center"
                                                    >
                                                        {paymentProcessing ? 'Processing Transaction...' : `Pay ₹${activeBooking.amount}`}
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {/* STEP B: ANIMATED CONFIRMATION SUCCESS VIEW */}
                                        {paymentStep === 'success' && (
                                            <div className="p-8 text-center space-y-4">
                                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto font-black shadow-sm animate-bounce">✓</div>
                                                <h4 className="text-xl font-black text-gray-900">Payment Processed Safely!</h4>
                                                <p className="text-sm text-gray-500 px-4">Your entry pass has been successfully generated in our records. Show your digital receipt at the door.</p>
                                                <button
                                                    onClick={() => setIsPayModalOpen(false)}
                                                    className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition shadow-md text-sm"
                                                >Dismiss Container View</button>
                                            </div>
                                        )}

                                        {/* STEP C: ERROR DISPLAY */}
                                        {paymentStep === 'error' && (
                                            <div className="p-8 text-center space-y-4">
                                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto font-black">✕</div>
                                                <h4 className="text-xl font-black text-gray-900">Transaction Failed</h4>
                                                <p className="text-sm text-gray-500 px-4">We were unable to secure transaction verification clear codes from your banking branch instance.</p>
                                                <div className="flex gap-2 mt-4">
                                                    <button onClick={() => setPaymentStep('form')} className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm rounded-xl transition">Try Again</button>
                                                    <button onClick={() => setIsPayModalOpen(false)} className="w-1/2 py-2 bg-gray-900 text-white font-bold text-sm rounded-xl transition">Close</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* end */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserDashboard;