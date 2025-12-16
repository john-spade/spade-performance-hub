import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query, ID, Permission, Role } from 'appwrite';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { AddGuardModal } from '@/components/ui/AddGuardModal';
import { AddClientModal } from '@/components/ui/AddClientModal';
import {
    LogOut,
    Users,
    BarChart3,
    Settings,
    Building,
    Shield,
    LayoutDashboard,
    TrendingUp,
    Eye,
    Edit,
    Trash2,
    Award,
    ChevronRight,
    Menu,
    X,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface Guard {
    id: string;
    name: string;
    guardId: string;
}

interface Client {
    id: string;
    name: string;
    clientId: string;
}

interface Evaluation {
    $id: string; // Added $id
    guardId: string;
    totalScore: number;
    createdAt: string;
}


interface TopPerformer {
    guardId: string;
    name: string;
    avgScore: number;
    evaluationCount: number;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminName, setAdminName] = useState('Admin');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Data
    const [guards, setGuards] = useState<Guard[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [monthlyData, setMonthlyData] = useState<{ name: string; evaluations: number }[]>([]);
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
    const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]); // New state

    // Modal State
    const [isAddGuardModalOpen, setIsAddGuardModalOpen] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (!session) {
            navigate('/');
            return;
        }

        const adminData = JSON.parse(session);
        setAdminName(adminData.username || 'Admin');
        setIsAuthenticated(true);

        // Fetch data
        fetchAllData();
    }, [navigate]);

    const fetchAllData = async () => {
        await Promise.all([
            fetchGuards(),
            fetchClients(),
            fetchEvaluations()
        ]);
    };

    const fetchGuards = async () => {
        try {
            const response = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS);
            const guardList = response.documents.map((doc: any) => ({
                id: doc.$id,
                name: doc.name,
                guardId: doc.guardId
            }));
            setGuards(guardList);
            return guardList;
        } catch (error) {
            console.error('Failed to fetch guards:', error);
            return [];
        }
    };

    const fetchClients = async () => {
        try {
            const response = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS);
            const clientList = response.documents.map((doc: any) => ({
                id: doc.$id,
                name: doc.name,
                clientId: doc.clientId
            }));
            setClients(clientList);
            return clientList;
        } catch (error) {
            console.error('Failed to fetch clients:', error);
            return [];
        }
    };

    const fetchEvaluations = async () => {
        try {
            const response = await databases.listDocuments(DB_ID, COLLECTIONS.EVALUATIONS, [
                Query.orderDesc('createdAt'),
                Query.limit(100)
            ]);

            const evalList = response.documents.map((doc: any) => ({
                $id: doc.$id,
                guardId: doc.guardId,
                totalScore: doc.totalScore || 0,
                createdAt: doc.createdAt
            }));

            setAllEvaluations(evalList); // Store full list


            calculateTopPerformers(evalList);
            generateMonthlyData(evalList);

        } catch (error) {
            console.error('Failed to fetch evaluations:', error);
        }
    };

    const calculateTopPerformers = async (evalList: Evaluation[]) => {
        try {
            const guardsRes = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS);
            const guardsMap: { [key: string]: string } = {};
            guardsRes.documents.forEach((doc: any) => {
                guardsMap[doc.guardId] = doc.name;
            });

            // Group by guard
            const guardStats: { [key: string]: { total: number; count: number } } = {};
            evalList.forEach(e => {
                if (!guardStats[e.guardId]) {
                    guardStats[e.guardId] = { total: 0, count: 0 };
                }
                guardStats[e.guardId].total += e.totalScore;
                guardStats[e.guardId].count += 1;
            });

            // Calculate averages and sort (lower score = better performance)
            const performers: TopPerformer[] = Object.entries(guardStats)
                .map(([guardId, stats]) => ({
                    guardId,
                    name: guardsMap[guardId] || guardId,
                    avgScore: stats.total / stats.count,
                    evaluationCount: stats.count
                }))
                .sort((a, b) => a.avgScore - b.avgScore)
                .slice(0, 10);

            setTopPerformers(performers);
        } catch (error) {
            console.error('Error calculating top performers:', error);
        }
    };

    const generateMonthlyData = (evalList: Evaluation[]) => {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return {
                date: d,
                name: d.toLocaleString('default', { month: 'short' }),
                key: `${d.getFullYear()}-${d.getMonth()}`
            };
        }).reverse();

        const data = last6Months.map(month => {
            const count = evalList.filter(e => {
                const d = new Date(e.createdAt);
                return `${d.getFullYear()}-${d.getMonth()}` === month.key;
            }).length;

            return {
                name: month.name,
                evaluations: count
            };
        });

        setMonthlyData(data);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        navigate('/');
    };

    const navigateToGuardProfile = (guardId: string) => {
        navigate(`/admin/guard/${guardId}`);
    };

    const navigateToClientProfile = (clientId: string) => {
        navigate(`/admin/client/${clientId}`);
    };

    const handleAddGuard = async (name: string, guardId: string) => {
        try {
            await databases.createDocument(
                DB_ID,
                COLLECTIONS.GUARDS,
                ID.unique(),
                {
                    name,
                    guardId,
                    createdAt: new Date().toISOString()
                }
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Guard Added',
                message: `${name} has been successfully added to the system.`
            });

            setIsAddGuardModalOpen(false);
            fetchGuards();
        } catch (error) {
            console.error('Error adding guard:', error);
            throw error;
        }
    };

    const handleAddClient = async (name: string, clientId: string, type: string, password: string) => {
        try {
            await databases.createDocument(
                DB_ID,
                COLLECTIONS.CLIENTS,
                ID.unique(),
                {
                    name,
                    clientId,
                    // type, // Schema doesn't support 'type' yet
                    password,
                    createdAt: new Date().toISOString()
                },
                // Add permissions if needed, otherwise default from collection
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Client Added',
                message: `${name} has been successfully added to the system.`
            });

            setIsAddClientModalOpen(false);
            fetchClients();
        } catch (error: any) {
            console.error('Error adding client:', error);
            throw error;
        }
    };

    if (!isAuthenticated) {
        return <div className="min-h-screen flex items-center justify-center bg-dark-900"><p className="text-gray-400">Loading...</p></div>;
    }

    return (
        <div className="min-h-screen bg-dark-900 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-dark-700">
                        <img src="https://spadesecurityservices.com/wp-content/uploads/2025/06/SSS-Spade-Security-Brand-Logos-V1_3.-Landscape-logo-White-W-Strapline-1024x242.webp" alt="Spade Logo" className="w-full h-auto" />
                    </div>

                    <div className="p-4 border-b border-dark-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-gold-500" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{adminName}</p>
                                <p className="text-gold-500 text-xs">Administrator</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2">
                        <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}>
                            <LayoutDashboard className="w-5 h-5" /> Dashboard
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}>
                            <BarChart3 className="w-5 h-5" /> Evaluation History
                        </button>
                        <button onClick={() => setActiveTab('guards')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'guards' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}>
                            <Users className="w-5 h-5" /> Guards
                        </button>
                        <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'clients' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}>
                            <Building className="w-5 h-5" /> Clients
                        </button>
                        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}>
                            <Settings className="w-5 h-5" /> Settings
                        </button>
                    </nav>

                    <div className="p-4 border-t border-dark-700">
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-dark-700 rounded-lg transition-colors">
                            <LogOut className="w-5 h-5" /> Sign Out
                        </button>
                    </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 lg:hidden text-gray-400"><X className="w-6 h-6" /></button>
            </aside>

            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Content */}
            <main className="flex-1 min-h-screen">
                <header className="lg:hidden bg-dark-800 border-b border-dark-700 p-4 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6 text-gray-400" /></button>
                    <h1 className="text-white font-bold">Admin Dashboard</h1>
                    <div className="w-6" />
                </header>

                <div className="p-6 lg:p-8">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            <div>
                                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                                <p className="text-gray-500">Overview of security operations</p>
                            </div>

                            {/* Stats Cards - 2 Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="p-6 bg-gradient-to-br from-dark-800 to-dark-900 border-dark-700 hover:border-gold-500/30 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Total Security Guards</p>
                                            <p className="text-4xl font-bold text-white mt-2">{guards.length}</p>
                                            <p className="text-green-500 text-sm mt-1 flex items-center gap-1">
                                                <TrendingUp className="w-4 h-4" /> Active personnel
                                            </p>
                                        </div>
                                        <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <Users className="w-7 h-7 text-blue-500" />
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 bg-gradient-to-br from-dark-800 to-dark-900 border-dark-700 hover:border-gold-500/30 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-gray-400 text-sm">Active Clients</p>
                                            <p className="text-4xl font-bold text-white mt-2">{clients.length}</p>
                                            <p className="text-gold-500 text-sm mt-1 flex items-center gap-1">
                                                <Building className="w-4 h-4" /> Partner sites
                                            </p>
                                        </div>
                                        <div className="w-14 h-14 bg-gold-500/20 rounded-xl flex items-center justify-center">
                                            <Building className="w-7 h-7 text-gold-500" />
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Monthly Activity Chart */}
                            <Card className="p-6 bg-dark-800/50 border-dark-700">
                                <h3 className="text-lg font-bold text-white mb-6">Monthly Activity</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#9CA3AF"
                                                tick={{ fill: '#9CA3AF' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                stroke="#9CA3AF"
                                                tick={{ fill: '#9CA3AF' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                                itemStyle={{ color: '#EAB308' }}
                                                cursor={{ fill: '#374151', opacity: 0.4 }}
                                            />
                                            <Bar
                                                dataKey="evaluations"
                                                fill="#EAB308"
                                                radius={[4, 4, 0, 0]}
                                                barSize={40}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Top Performers - Full Width */}
                            <Card className="p-6 bg-dark-800/50 border-dark-700">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Award className="w-6 h-6 text-gold-500" />
                                        <h3 className="text-lg font-bold text-white">Top Performers</h3>
                                    </div>
                                    <span className="text-gray-500 text-sm">Lowest penalty points = Best performance</span>
                                </div>

                                {topPerformers.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No performance data available yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {topPerformers.map((performer, idx) => (
                                            <button
                                                key={performer.guardId}
                                                onClick={() => navigateToGuardProfile(performer.guardId)}
                                                className="w-full flex items-center justify-between p-4 bg-dark-900 hover:bg-dark-700 rounded-lg transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-gold-500 text-dark-900' :
                                                        idx === 1 ? 'bg-gray-400 text-dark-900' :
                                                            idx === 2 ? 'bg-orange-600 text-white' :
                                                                'bg-dark-700 text-gray-400'
                                                        }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-white font-medium">{performer.name}</p>
                                                        <p className="text-gray-500 text-sm">{performer.guardId} • {performer.evaluationCount} evaluations</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className={`font-bold ${performer.avgScore === 0 ? 'text-green-500' : performer.avgScore < 3 ? 'text-gold-500' : 'text-red-500'}`}>
                                                            {performer.avgScore.toFixed(1)} pts
                                                        </p>
                                                        <p className="text-gray-500 text-xs">Avg. penalty</p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gold-500 transition-colors" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <Card className="p-6 bg-dark-800/50 max-w-6xl mx-auto">
                            <h2 className="text-xl font-bold text-white mb-4">Evaluation History</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-dark-700 text-gray-500 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-medium">Date</th>
                                            <th className="p-4 font-medium">Guard</th>
                                            <th className="p-4 font-medium">Points</th>
                                            <th className="p-4 font-medium">Action</th>
                                            <th className="p-4 font-medium text-right">View</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {allEvaluations.map((evalItem) => {
                                            const guard = guards.find(g => g.guardId === evalItem.guardId);
                                            const rec = (() => {
                                                const total = evalItem.totalScore;
                                                if (total >= 10) return { action: 'SEPARATION', color: 'text-red-500' };
                                                if (total >= 7) return { action: 'FINAL WRITE-UP', color: 'text-orange-500' };
                                                if (total >= 3) return { action: 'WARNING', color: 'text-yellow-500' };
                                                return { action: 'GOOD STANDING', color: 'text-green-500' };
                                            })();

                                            return (
                                                <tr
                                                    key={evalItem.$id}
                                                    onClick={() => navigate(`/admin/evaluation/${evalItem.$id}`)}
                                                    className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors cursor-pointer group"
                                                >
                                                    <td className="p-4 text-gray-300">{new Date(evalItem.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4">
                                                        <p className="text-white font-medium">{guard ? guard.name : evalItem.guardId}</p>
                                                        <p className="text-gray-500 text-xs">{evalItem.guardId}</p>
                                                    </td>
                                                    <td className="p-4 font-bold text-white">{evalItem.totalScore}</td>
                                                    <td className={`p-4 font-bold text-xs ${rec.color}`}>{rec.action}</td>
                                                    <td className="p-4 text-right">
                                                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Report
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {allEvaluations.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">No evaluations found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'guards' && (
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Guards</h2>
                                    <p className="text-gray-500">Manage your workforce</p>
                                </div>
                                <Button
                                    onClick={() => setIsAddGuardModalOpen(true)}
                                    className="bg-gold-500 text-dark-900 font-bold hover:bg-gold-400"
                                >
                                    + Add Guard
                                </Button>
                            </div>

                            <Card className="bg-dark-800/50 border-dark-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-dark-700 text-gray-500 text-xs uppercase tracking-wider">
                                                <th className="p-4 font-medium">Name</th>
                                                <th className="p-4 font-medium">Position</th>
                                                <th className="p-4 font-medium">Department</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {guards.map((g) => (
                                                <tr
                                                    key={g.id}
                                                    onClick={() => navigateToGuardProfile(g.guardId)}
                                                    className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors group cursor-pointer"
                                                >
                                                    <td className="p-4">
                                                        <p className="text-white font-medium">{g.name}</p>
                                                        <p className="text-gray-500 text-xs">{g.guardId}</p>
                                                    </td>
                                                    <td className="p-4 text-gray-300">Security Guard</td>
                                                    <td className="p-4 text-gray-300">Patrol</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">
                                                            active
                                                        </span>
                                                    </td>
                                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <button className="p-2 text-gray-500 hover:text-white hover:bg-dark-700 rounded transition-colors">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigateToGuardProfile(g.guardId)}
                                                                className="p-2 text-gray-500 hover:text-gold-500 hover:bg-dark-700 rounded transition-colors"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-dark-700 rounded transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {guards.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                                        No guards found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'clients' && (
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Clients</h2>
                                    <p className="text-gray-500">Manage client sites</p>
                                </div>
                                <Button
                                    onClick={() => setIsAddClientModalOpen(true)}
                                    className="bg-gold-500 text-dark-900 font-bold hover:bg-gold-400"
                                >
                                    + Add Client
                                </Button>
                            </div>

                            <Card className="bg-dark-800/50 border-dark-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-dark-700 text-gray-500 text-xs uppercase tracking-wider">
                                                <th className="p-4 font-medium">Client Name</th>
                                                <th className="p-4 font-medium">Client ID</th>
                                                <th className="p-4 font-medium">Type</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {clients.map((c) => (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => navigateToClientProfile(c.clientId)}
                                                    className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-4">
                                                        <p className="text-white font-medium">{c.name}</p>
                                                    </td>
                                                    <td className="p-4 text-gold-500 font-mono text-xs">{c.clientId}</td>
                                                    <td className="p-4 text-gray-300">Corporate</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">
                                                            active
                                                        </span>
                                                    </td>
                                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <button className="p-2 text-gray-500 hover:text-white hover:bg-dark-700 rounded transition-colors">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigateToClientProfile(c.clientId)}
                                                                className="p-2 text-gray-500 hover:text-gold-500 hover:bg-dark-700 rounded transition-colors"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-dark-700 rounded transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {clients.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                                        No clients found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <Card className="p-6 bg-dark-800/50 max-w-4xl mx-auto">
                            <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
                            <p className="text-gray-500">Coming soon...</p>
                        </Card>
                    )}
                </div>
            </main>

            <AddGuardModal
                isOpen={isAddGuardModalOpen}
                onClose={() => setIsAddGuardModalOpen(false)}
                onSave={handleAddGuard}
            />
            <AddClientModal
                isOpen={isAddClientModalOpen}
                onClose={() => setIsAddClientModalOpen(false)}
                onSave={handleAddClient}
            />
            <NotificationModal isOpen={notification.isOpen} type={notification.type} title={notification.title} message={notification.message} onClose={() => setNotification({ ...notification, isOpen: false })} />
        </div>
    );
}
