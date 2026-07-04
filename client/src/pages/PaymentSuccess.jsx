import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/axios';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const bookingId = searchParams.get('bookingId');
    const [status, setStatus] = useState('verifying');

    useEffect(() => {
        const confirmPaymentInDatabase = async () => {
            try {
                // Tell the backend to officially save the status as paid now
                // Create a clean webhook or endpoint parameter for finalizing
                await api.post(`/bookings/finalize-payment`, { bookingId });
                setStatus('success');
            } catch (err) {
                setStatus('error');
            }
        };

        if (bookingId) confirmPaymentInDatabase();
    }, [bookingId]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                
                {status === 'verifying' && <p className="text-gray-500 font-medium">Securing transaction records...</p>}
                
                {status === 'success' && (
                    <>
                        {/* Smooth Animated Green Checkmark Check Circle Using Framer Motion */}
                        <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
                        >
                            ✓
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-black text-gray-900 mb-2"
                        >
                            Payment Received!
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-gray-500 mb-8"
                        >
                            Your pass is confirmed. Get ready for an awesome event!
                        </motion.p>

                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-xl transition shadow-md"
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <p className="text-red-500 font-semibold">Payment logged successfully on Stripe, but couldn't update local records. Contact support.</p>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;