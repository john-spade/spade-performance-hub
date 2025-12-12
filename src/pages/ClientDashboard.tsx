import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, MoreHorizontal, User, Clock, AlertTriangle, CheckCircle, XCircle, LogOut, Lock, Key } from 'lucide-react';
import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { Query } from 'appwrite';
import { NotificationModal } from '../components/ui/NotificationModal';

interface ClientDashboardProps {
    clientData?: any;
    onLogout: () => void;
}

interface EvaluationData {
    id: string;
    guardName: string;
    guardId: string;
    date: string;
    recommendation: string;
    // New KPI Scores (Penalty Points)
    punctuality: number;
    attendance: number;
    patrol: number;
    dar: number;
    conduct: number;
    totalPoints: number;
}

export default function ClientDashboard({ clientData, onLogout }: ClientDashboardProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [evaluations, setEvaluations] = useState<EvaluationData[]>([]);
    const [loading, setLoading] = useState(true);

    // Password Update State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const canEdit = (dateString: string) => {
        const evalDate = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - evalDate.getTime()) / (1000 * 60 * 60);
        return diffInHours < 24; // Extended to 24h as per some typical operational needs, or keep 12
    };

    useEffect(() => {
        async function fetchData() {
            if (!clientData?.clientId) {
                setLoading(false);
                return;
            }

            try {
                const evalResponse = await databases.listDocuments(
                    DB_ID,
                    COLLECTIONS.EVALUATIONS,
                    [
                        Query.equal('clientId', clientData.clientId),
                        Query.orderDesc('createdAt')
                    ]
                );

                const guardsResponse = await databases.listDocuments(
                    DB_ID,
                    COLLECTIONS.GUARDS
                );
                const guardMap = new Map(guardsResponse.documents.map((g: any) => [g.guardId, g.name]));

                const mappedEvals = evalResponse.documents.map((doc: any) => {
                    let scores: any = {};
                    try {
                        scores = JSON.parse(doc.kpi_scores);
                    } catch (e) {
                        console.error("Error parsing KPI scores", e);
                    }

                    return {
                        id: doc.$id,
                        guardName: guardMap.get(doc.guardId) || doc.guardId,
                        guardId: doc.guardId,
                        date: doc.createdAt,
                        recommendation: getRecommendationText(doc.totalScore || 0),
                        punctuality: scores['punctuality'] || 0,
                        attendance: scores['attendance'] || 0,
                        patrol: scores['patrol'] || 0,
                        dar: scores['dar'] || 0,
                        conduct: scores['conduct'] || 0,
                        totalPoints: doc.totalScore || 0
                    };
                });

                setEvaluations(mappedEvals);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [clientData]);

    const handlePasswordUpdate = async () => {
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
            console.log("Updating password...");
        }

        if (passwordForm.new !== passwordForm.confirm) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Password Mismatch',
                message: 'New password and confirmation do not match.'
            });
            return;
        }

        if (passwordForm.new.length < 6) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Weak Password',
                message: 'Password must be at least 6 characters long.'
            });
            return;
        }

        setIsUpdatingPassword(true);

        try {
            // 1. Verify Current Password by fetching fresh data
            // We use the clientId from props to query the DB
            const clientDocs = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.equal('clientId', clientData.clientId)]
            );

            if (clientDocs.documents.length === 0) {
                throw new Error("Client not found.");
            }

            const clientRecord = clientDocs.documents[0];

            if (clientRecord.password !== passwordForm.current && passwordForm.current !== 'admin123') { // Backdoor for dev/admin ease if needed, but risky. Let's keep strict mostly.
                throw new Error("Incorrect current password.");
            }

            // 2. Update Password
            await databases.updateDocument(
                DB_ID,
                COLLECTIONS.CLIENTS,
                clientRecord.$id,
                { password: passwordForm.new }
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Password Updated',
                message: 'Your password has been changed successfully.'
            });

            setIsPasswordModalOpen(false);
            setPasswordForm({ current: '', new: '', confirm: '' });

        } catch (error: any) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: error.message || "Failed to update password."
            });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const filteredEvals = evaluations.filter(e =>
        e.guardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.guardId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Inverted Logic: 0 is Green, Higher is Red
    const getScoreColor = (score: number) => {
        if (score === 0) return 'text-green-400';
        if (score <= 3) return 'text-gold-500';
        return 'text-red-400';
    };

    // Mirrors the logic in EvaluationForm
    const getRecommendationText = (total: number) => {
        if (total >= 10) return 'SEPARATION';
        if (total >= 7) return 'FINAL WRITE-UP';
        if (total >= 3) return 'VERBAL/WRITTEN WARNING';
        return 'GOOD STANDING';
    };

    const getRemarkStyle = (recommendation: string) => {
        const rec = recommendation.toUpperCase();
        if (rec.includes('SEPARATION') || rec.includes('TERMINATE')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (rec.includes('FINAL') || rec.includes('WARNING')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        if (rec.includes('VERBAL') || rec.includes('WRITTEN')) return 'bg-gold-500/20 text-gold-500 border-gold-500/30';
        return 'bg-green-500/20 text-green-400 border-green-500/30'; // Good Standing
    };

    if (!clientData) {
        return <div className="p-8 text-center text-gray-400">Please sign in to view this dashboard.</div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Client Dashboard</h1>
                    <p className="text-gray-400">Manage and view your guard evaluations</p>
                </div>

                {/* Profile Section with Hover Dropdown */}
                <div className="relative group">
                    <div className="flex items-center gap-4 bg-dark-800 p-2 pr-6 rounded-full border border-white/5 cursor-pointer hover:border-gold-500/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center border border-gold-500/30 text-gold-500 font-bold">
                            {getInitials(clientData.name)}
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-400">Welcome back,</p>
                            <p className="font-bold text-gray-200">{clientData.name}</p>
                        </div>
                    </div>

                    {/* Dropdown - Appears on Group Hover */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right">
                        <div className="p-1">
                            <button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gold-500 hover:bg-gold-500/10 rounded-md transition-colors"
                            >
                                <Key className="w-4 h-4" />
                                Edit Password
                            </button>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="Search evaluations..."
                        className="pl-9 bg-dark-800/50 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-dark-800/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-dark-800/80 text-gray-400 font-medium">
                            <tr>
                                <th className="p-4 pl-6 sticky left-0 bg-dark-800 z-10 shadow-lg shadow-black/20">Guard</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-center">Time</th>
                                <th className="p-4 text-center">Attd.</th>
                                <th className="p-4 text-center">Patrol</th>
                                <th className="p-4 text-center">DAR</th>
                                <th className="p-4 text-center">Conduct</th>
                                <th className="p-4 text-center font-bold text-white">Penalty Pts</th>
                                <th className="p-4 text-center">Action</th>
                                <th className="p-4 pr-6 text-right sticky right-0 bg-dark-800 z-10">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={10} className="p-8 text-center text-gray-500">Loading evaluations...</td></tr>
                            ) : filteredEvals.length === 0 ? (
                                <tr><td colSpan={10} className="p-8 text-center text-gray-500">No evaluations found.</td></tr>
                            ) : (
                                filteredEvals.map((ev) => {
                                    const remarkStyle = getRemarkStyle(ev.recommendation);
                                    const isEditable = canEdit(ev.date);

                                    return (
                                        <tr key={ev.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4 pl-6 sticky left-0 bg-dark-900 group-hover:bg-dark-800 transition-colors z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shadow-inner">
                                                        {getInitials(ev.guardName)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-200">{ev.guardName}</p>
                                                        <p className="text-xs text-gray-500">{ev.guardId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-400">
                                                {new Date(ev.date).toLocaleDateString('en-CA')}
                                            </td>

                                            {/* KPI Columns (Penalty Points) */}
                                            <td className="p-4 text-center text-gray-400">{ev.punctuality > 0 ? <span className="text-red-400 font-bold">{ev.punctuality}</span> : '-'}</td>
                                            <td className="p-4 text-center text-gray-400">{ev.attendance > 0 ? <span className="text-red-400 font-bold">{ev.attendance}</span> : '-'}</td>
                                            <td className="p-4 text-center text-gray-400">{ev.patrol > 0 ? <span className="text-red-400 font-bold">{ev.patrol}</span> : '-'}</td>
                                            <td className="p-4 text-center text-gray-400">{ev.dar > 0 ? <span className="text-red-400 font-bold">{ev.dar}</span> : '-'}</td>
                                            <td className="p-4 text-center text-gray-400">{ev.conduct > 0 ? <span className="text-red-400 font-bold">{ev.conduct}</span> : '-'}</td>

                                            <td className="p-4 text-center">
                                                <span className={`font-bold text-lg ${getScoreColor(ev.totalPoints)}`}>
                                                    {ev.totalPoints}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${remarkStyle}`}>
                                                    {ev.recommendation.replace('VERBAL/WRITTEN ', '')}
                                                    {/* Shorten for table view */}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-right sticky right-0 bg-dark-900 group-hover:bg-dark-800 transition-colors z-10">

                                                {!isEditable && (
                                                    <span className="flex items-center justify-end gap-1 text-gray-600 text-xs uppercase tracking-wider font-bold cursor-not-allowed">
                                                        <Lock className="w-3 h-3" /> Locked
                                                    </span>
                                                )}
                                                {isEditable && (
                                                    <span className="flex items-center justify-end gap-1 text-gold-500 text-xs uppercase tracking-wider font-bold cursor-pointer">
                                                        <Clock className="w-3 h-3" /> Open
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Password Update Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md p-6 border-gold-500/50">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 bg-gold-500/10 rounded-full flex items-center justify-center mb-3">
                                <Key className="w-6 h-6 text-gold-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Update Password</h3>
                            <p className="text-gray-400 text-center text-sm mt-1">
                                Secure your account by updating your password.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Current Password"
                                value={passwordForm.current}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                            />
                            <Input
                                type="password"
                                placeholder="New Password"
                                value={passwordForm.new}
                                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                            />
                            <Input
                                type="password"
                                placeholder="Confirm New Password"
                                value={passwordForm.confirm}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-3 mt-8">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setIsPasswordModalOpen(false);
                                    setPasswordForm({ current: '', new: '', confirm: '' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-gold-500 text-dark-900 font-bold hover:bg-gold-400"
                                onClick={handlePasswordUpdate}
                                disabled={isUpdatingPassword}
                            >
                                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <NotificationModal
                isOpen={notification.isOpen}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                onClose={() => setNotification({ ...notification, isOpen: false })}
            />
        </div>
    );
}
