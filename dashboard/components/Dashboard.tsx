import React, { useEffect, useState } from 'react';
import { StatMetric } from '../types';
import { db } from '../services/dbService';
import { ArrowUp, ArrowDown, Users, Mail, Target, DollarSign, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const DATA_LEADS = [
  { name: 'Mon', leads: 40, emails: 24 },
  { name: 'Tue', leads: 30, emails: 13 },
  { name: 'Wed', leads: 20, emails: 98 },
  { name: 'Thu', leads: 27, emails: 39 },
  { name: 'Fri', leads: 18, emails: 48 },
  { name: 'Sat', leads: 23, emails: 38 },
  { name: 'Sun', leads: 34, emails: 43 },
];

const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<StatMetric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            const data = await db.getDashboardMetrics();
            setMetrics(data);
            setLoading(false);
        };
        loadMetrics();
    }, []);

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-dakdan-navy" size={32} /></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Intro Banner */}
            <div className="bg-gradient-to-r from-dakdan-navy to-blue-900 rounded-xl p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Welcome to Dakdan HQ</h2>
                <p className="opacity-90 max-w-2xl">
                    Your digital workforce is active. We are currently scaling operations for ZooMedia and Sports Media divisions. 
                    Problem: Manual prospecting was slow. Solution: AI agents are now auto-scraping 24/7.
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-slate-500">{metric.label}</span>
                            <div className={`p-1.5 rounded-lg bg-${metric.color}-100 text-${metric.color}-600`}>
                                {idx === 0 ? <Users size={16} /> : idx === 1 ? <Target size={16} /> : idx === 2 ? <DollarSign size={16} /> : <Mail size={16} />}
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
                        <div className={`flex items-center text-xs font-medium mt-2 ${metric.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {metric.trendDirection === 'up' ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
                            {metric.trend}% from last week
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Lead Velocity (Stan)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DATA_LEADS}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="leads" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Outreach Activity (Sonny)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={DATA_LEADS}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Line type="monotone" dataKey="emails" stroke="#16a34a" strokeWidth={3} dot={{fill: '#16a34a', strokeWidth: 2, r: 4, stroke: '#fff'}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Division Status */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Division Health</h3>
                    <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <h4 className="font-semibold text-slate-700">ZooMedia</h4>
                        </div>
                        <p className="text-sm text-slate-500">34 new partner requests processed this week.</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <h4 className="font-semibold text-slate-700">Sports Media</h4>
                        </div>
                        <p className="text-sm text-slate-500">Implied sponsorship algorithm running at 98% efficiency.</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-3 h-3 rounded-full bg-dakdan-gold"></div>
                            <h4 className="font-semibold text-slate-700">Money Smarts</h4>
                        </div>
                        <p className="text-sm text-slate-500">New financial curriculum leads identified.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 
