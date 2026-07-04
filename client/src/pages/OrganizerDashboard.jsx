import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaDollarSign, FaTicketAlt, FaCalendarCheck, FaFileCsv } from 'react-icons/fa';

const OrganizerDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await api.get('/bookings/organizer/analytics');
                setAnalytics(data);
            } catch (err) {
                setError('Failed to fetch dashboard intelligence reports.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // Practical helper utility logic to instantly download tables as raw operational .CSV records
    const downloadCSVReport = (event) => {
        const headers = ['Event Title, Total Capacity, Tickets Sold, Revenue Earned\n'];
        const rows = analytics.eventPerformance.map(e => 
            `"${e.title}",${e.totalCapacity},${e.seatsSold},₹${e.revenue}`
        );
        const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `Eventora_Performance_Report_${Date.now()}.csv`);
        a.click();
    };

    if (loading) return <div className="text-center py-20 text-xl font-medium">Loading Business Intelligence Suite...</div>;
    if (error) return <div className="text-center py-20 text-red-500 font-medium">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-16">
            
            {/* Header Area */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Organizer Control Center</h1>
                    <p className="text-sm text-gray-500">Live system performance indicators and ledger books.</p>
                </div>
                <button 
                    onClick={downloadCSVReport}
                    className="flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow transition"
                >
                    <FaFileCsv /> Export Platform Data
                </button>
            </div>

            {/* High Level Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Gross Revenue</p>
                        <h3 className="text-3xl font-black text-gray-900 mt-1">₹{analytics.summary.totalRevenue}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl font-bold"><FaDollarSign /></div>
                </div>

                <div className="bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Tickets Redeemed</p>
                        <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics.summary.totalTicketsSold} Passes</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold"><FaTicketAlt /></div>
                </div>

                <div className="bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Campaign Targets</p>
                        <h3 className="text-3xl font-black text-gray-900 mt-1">{analytics.summary.activeEventsCount} Hosted</h3>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl font-bold"><FaCalendarCheck /></div>
                </div>
            </div>

            {/* Event Performance Tracking Table Grid Area */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">Individual Event Allocation Ledger</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-400 tracking-wider">
                                <th className="p-4 pl-6">Event Identity Title</th>
                                <th className="p-4">Operational Status</th>
                                <th className="p-4 text-center">Ticket Sale Ratio</th>
                                <th className="p-4 pr-6 text-right">Net Revenue Breakdown</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                            {analytics.eventPerformance.map((item) => {
                                const capacityPercentage = Math.round((item.seatsSold / item.totalCapacity) * 100) || 0;
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                                        <td className="p-4 pl-6 font-bold text-gray-900">{item.title}</td>
                                        <td className="p-4">
                                            <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold ${new Date(item.date) > new Date() ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {new Date(item.date) > new Date() ? 'Upcoming' : 'Concluded'}
                                            </span>
                                        </td>
                                        <td className="p-4 w-64">
                                            <div className="flex items-center gap-3 justify-center">
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative border">
                                                    <div 
                                                        className="bg-gray-900 h-full rounded-full transition-all" 
                                                        style={{ width: `${capacityPercentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold shrink-0">{item.seatsSold}/{item.totalCapacity} ({capacityPercentage}%)</span>
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-right font-black text-gray-900">₹{item.revenue}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default OrganizerDashboard;