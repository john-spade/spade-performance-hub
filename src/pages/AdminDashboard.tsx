import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Users, Star, TrendingUp, Shield, Activity, Bell } from 'lucide-react';
import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import GuardsList from '../components/admin/GuardsList';
import ClientsList from '../components/admin/ClientsList';
import GuardProfile from '../components/admin/GuardProfile';

export default function AdminDashboard() {
    const [currentView, setCurrentView] = useState<'overview' | 'guards' | 'clients' | 'guard_profile'>('overview');
    const [selectedGuard, setSelectedGuard] = useState<{ id: string; name: string } | null>(null);

    const [stats, setStats] = useState({
        totalGuards: 0,
        totalClients: 0,
        avgScore: 0,
        activeAlerts: 3 // Mocked for now or logic to be added
    });
    const [loading, setLoading] = useState(true);

    // Mock Data for Graph (Row 2)
    const mockGraphData = [
        { name: 'Jan', guards: 40, clients: 24 },
        { name: 'Feb', guards: 45, clients: 25 },
        { name: 'Mar', guards: 48, clients: 28 },
        { name: 'Apr', guards: 52, clients: 30 },
        { name: 'May', guards: 55, clients: 32 },
        { name: 'Jun', guards: 58, clients: 35 },
    ];

    // Mock Data for Top Guards (Row 3)
    const [topGuards, setTopGuards] = useState<any[]>([]);

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Fetch Counts
                const guards = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS);
                const clients = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS);

                // 2. Fetch Evals for Avg Score & Top Guards
                const evals = await databases.listDocuments(DB_ID, COLLECTIONS.EVALUATIONS);

                let totalScore = 0;
                const guardScores: Record<string, { name: string, total: number, count: number }> = {};

                // Map guard ID to Name first
                const guardMap = new Map(guards.documents.map((g: any) => [g.guardId, g.name]));

                evals.documents.forEach((doc: any) => {
                    totalScore += doc.totalScore || 0;

                    if (!guardScores[doc.guardId]) {
                        guardScores[doc.guardId] = {
                            name: guardMap.get(doc.guardId) || doc.guardId,
                            total: 0,
                            count: 0
                        };
                    }
                    guardScores[doc.guardId].total += doc.totalScore || 0;
                    guardScores[doc.guardId].count += 1;
                });

                const avg = evals.total > 0 ? (totalScore / evals.total).toFixed(1) : '0';

                // Calculate Top 5
                const sortedGuards = Object.values(guardScores)
                    .map(g => ({ ...g, average: (g.total / g.count).toFixed(1) }))
                    .sort((a, b) => Number(b.average) - Number(a.average))
                    .slice(0, 5);

                setStats({
                    totalGuards: guards.total,
                    totalClients: clients.total,
                    avgScore: Number(avg),
                    activeAlerts: 3
                });

                setTopGuards(sortedGuards);

            } catch (e) {
                console.error("Error fetching admin stats", e);
            } finally {
                setLoading(false);
            }
        }

        if (currentView === 'overview') {
            fetchStats();
        }
    }, [currentView]);

    const handleSelectGuard = (guardId: string, guardName: string) => {
        setSelectedGuard({ id: guardId, name: guardName });
        setCurrentView('guard_profile');
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Row 1: Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    className="p-6 border-l-4 border-l-blue-500 hover:border-blue-400 cursor-pointer transition-all hover:bg-white/5 group"
                    onClick={() => setCurrentView('guards')}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Active Guards</p>
                            <h3 className="text-4xl font-bold text-white mt-2">{stats.totalGuards}</h3>
                            <p className="text-xs text-blue-400 mt-2 group-hover:underline">View Master List →</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Shield className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-6 border-l-4 border-l-purple-500 hover:border-purple-400 cursor-pointer transition-all hover:bg-white/5 group"
                    onClick={() => setCurrentView('clients')}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Active Clients</p>
                            <h3 className="text-4xl font-bold text-white mt-2">{stats.totalClients}</h3>
                            <p className="text-xs text-purple-400 mt-2 group-hover:underline">View Master List →</p>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Users className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-gold-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Avg Overall Score</p>
                            <h3 className="text-4xl font-bold text-gold-500 mt-2">{stats.avgScore}%</h3>
                            <p className="text-xs text-gold-400/70 mt-2">System Wide Performance</p>
                        </div>
                        <div className="p-3 bg-gold-500/10 rounded-lg">
                            <Activity className="w-8 h-8 text-gold-500" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Row 2: Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-6 bg-dark-800/50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Monthly Activity Trend</h3>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1 text-gray-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Guards</span>
                            <span className="flex items-center gap-1 text-gray-400"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Clients</span>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockGraphData}>
                                <defs>
                                    <linearGradient id="colorGuards" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#666" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111818', borderColor: '#333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="guards" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGuards)" />
                                <Area type="monotone" dataKey="clients" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorClients)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Status Breakdown (Terminated/Deactivated) Holder - Using as Alert/Status for now as requested */}
                <Card className="p-6 bg-dark-800/50">
                    <h3 className="text-lg font-bold text-white mb-6">Status Monitoring</h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                            <span className="text-red-400 font-medium">Terminated Guards</span>
                            <span className="text-2xl font-bold text-white">2</span>
                        </div>
                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                            <span className="text-orange-400 font-medium">Deactivated Clients</span>
                            <span className="text-2xl font-bold text-white">1</span>
                        </div>
                        <div className="p-4 rounded-lg bg-dark-700/50 border border-white/5 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                System stats are monitored daily. Alerts will appear here.
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Row 3: Top Guards List */}
            <Card className="p-6 bg-dark-800/50">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Top Performing Guards</h3>
                    <button className="text-xs text-gold-500 hover:text-gold-400">View Full Reports</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-500 text-sm border-b border-white/5">
                                <th className="pb-3 pl-2">Rank</th>
                                <th className="pb-3">Guard Name</th>
                                <th className="pb-3 text-right">Avg. Score</th>
                                <th className="pb-3 text-right">Evaluations</th>
                                <th className="pb-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {topGuards.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No data available</td></tr>
                            ) : (
                                topGuards.map((guard, idx) => (
                                    <tr
                                        key={idx}
                                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => handleSelectGuard(guard.name, guard.name)} // Using name as ID for now since stats are aggregated by ID but mapped to name. Ideally pass real ID.
                                    >
                                        <td className="py-4 pl-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-gold-500 text-black' :
                                                idx === 1 ? 'bg-gray-300 text-black' :
                                                    idx === 2 ? 'bg-orange-700 text-white' : 'bg-dark-700 text-gray-400'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                        </td>
                                        <td className="py-4 font-medium text-white">{guard.name}</td>
                                        <td className="py-4 text-right">
                                            <span className="text-gold-500 font-bold">{guard.average}</span>
                                        </td>
                                        <td className="py-4 text-right text-gray-400">{guard.count}</td>
                                        <td className="py-4 text-right">
                                            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Excellent</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            <header className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                        {currentView === 'overview' && 'Dashboard Overview'}
                        {currentView === 'guards' && 'Guards Management'}
                        {currentView === 'clients' && 'Client Management'}
                        {currentView === 'guard_profile' && 'Guard Profile'}
                    </h1>
                    <p className="text-gray-400">
                        {currentView === 'overview' && 'Welcome back, Operations Manager!'}
                        {currentView === 'guards' && 'Manage security personnel and assignments'}
                        {currentView === 'clients' && 'Manage client accounts and contracts'}
                        {currentView === 'guard_profile' && 'Detailed performance metrics'}
                    </p>
                </div>

                <div className="flex gap-4">
                    {currentView !== 'overview' && (
                        <button
                            onClick={() => setCurrentView('overview')}
                            className="bg-dark-800 text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-gold-500/50 transition-all flex items-center gap-2"
                        >
                            ← Back to Dashboard
                        </button>
                    )}
                    <button className="bg-dark-800 p-2 rounded-full border border-white/10 text-gray-400 hover:text-white">
                        <Bell className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-black font-bold">
                        OM
                    </div>
                </div>
            </header>

            {currentView === 'overview' && renderOverview()}
            {currentView === 'guards' && <GuardsList onSelectGuard={handleSelectGuard} />}
            {currentView === 'clients' && <ClientsList />}
            {currentView === 'guard_profile' && selectedGuard && (
                <GuardProfile
                    guardId={selectedGuard.id}
                    guardName={selectedGuard.name}
                    onBack={() => setCurrentView('guards')}
                />
            )}
        </div>
    );
}
