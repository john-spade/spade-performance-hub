import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID, Permission, Role, Query } from 'appwrite';
import { NotificationModal } from '@/components/ui/NotificationModal';
import {
    LogOut,
    ClipboardList,
    Users,
    BarChart3,
    Menu,
    X,
    AlertTriangle,
    UserMinus,
    FileWarning,
    Calendar,
    User as UserIcon
} from 'lucide-react';

// KPI Categories
const KPI_CATEGORIES = [
    {
        id: 'punctuality',
        label: 'Showing Up on Time (0-3 Points)',
        description: 'Measures punctuality and readiness for duty.',
        options: [
            { points: 0, label: 'On time' },
            { points: 0.5, label: 'Late by 5 minutes or less' },
            { points: 1, label: 'Late by more than 5 minutes and up to 10 minutes' },
            { points: 2, label: 'Late by more than 10 minutes' },
            { points: 3, label: 'Repeated or excessive lateness within the evaluation period' },
        ]
    },
    {
        id: 'attendance',
        label: 'Attendance & Reliability (0-10 Points)',
        description: 'Measures overall dependability and ability to maintain scheduled shifts.',
        options: [
            { points: 0, label: 'Perfect attendance, no call-offs, fully reliable' },
            { points: 1, label: 'One call-off with sufficient notice (at least 4 hours)' },
            { points: 2, label: 'One call-off with short notice (less than 4 hours)' },
            { points: 10, label: 'No-call/no-show' },
        ]
    },
    {
        id: 'patrol',
        label: 'Patrol Completion & Timeliness (0-3 Points)',
        description: 'Ensures patrol duties are completed correctly and on schedule.',
        options: [
            { points: 0, label: 'All patrols completed properly and on time' },
            { points: 0.5, label: 'Minor errors in patrol completion' },
            { points: 1, label: 'Significant patrol errors or repeated minor issues' },
            { points: 2, label: 'Patrols routinely incomplete' },
            { points: 3, label: 'Patrols consistently neglected or skipped' },
        ]
    },
    {
        id: 'dar',
        label: 'DAR (Daily Activity Report) Quality (0-3 Points)',
        description: 'Ensures reports are accurate, complete, professional, and submitted on time.',
        options: [
            { points: 0, label: 'Accurate, complete, professional, and submitted on time' },
            { points: 1, label: 'Second quality issue or incomplete DAR' },
            { points: 2, label: 'Continued issues or repeated inaccuracies' },
            { points: 3, label: 'Consistent non-compliance with DAR standards' },
        ]
    },
    {
        id: 'conduct',
        label: 'Professional Conduct (0-10 Points)',
        description: 'Measures behavior, communication, and adherence to professional standards.',
        options: [
            { points: 0, label: 'Professional conduct at all times' },
            { points: 1, label: 'First instance of unprofessional behavior' },
            { points: 2, label: 'Repeated misconduct or escalation' },
            { points: 5, label: 'Serious conduct issues' },
            { points: 10, label: 'Unprofessional conduct towards staff, clients, or tenants' },
        ]
    }
];

interface Guard {
    id: string;
    name: string;
    guardId: string;
}

interface ClientSession {
    $id: string;
    name: string;
    clientId: string;
    representativeName: string;
    email: string;
}

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [clientSession, setClientSession] = useState<ClientSession | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('evaluate');

    // Guard selection
    const [guards, setGuards] = useState<Guard[]>([]);
    const [selectedGuardId, setSelectedGuardId] = useState('');
    const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);

    // History selection
    const [history, setHistory] = useState<any[]>([]);

    // Evaluation form state
    const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [evaluatorSignature, setEvaluatorSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    // Check authentication and fetch data
    useEffect(() => {
        const session = localStorage.getItem('client_session');
        if (!session) {
            navigate('/');
            return;
        }

        const clientData = JSON.parse(session);
        setClientSession(clientData);

        // Initialize scores and remarks
        const initialScores: Record<string, number> = {};
        const initialRemarks: Record<string, string> = {};
        KPI_CATEGORIES.forEach(cat => {
            initialScores[cat.id] = 0;
            initialRemarks[cat.id] = '';
        });
        setScores(initialScores);
        setRemarks(initialRemarks);

        // Fetch guards
        fetchGuards();
        // Fetch history
        fetchHistory();
    }, [navigate]);

    const fetchGuards = async () => {
        try {
            const response = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS);
            const guardList = response.documents.map((doc: any) => ({
                id: doc.$id,
                name: doc.name,
                guardId: doc.guardId
            }));
            setGuards(guardList);
        } catch (error) {
            console.error('Failed to fetch guards:', error);
        }
    };

    const fetchHistory = async () => {
        const session = localStorage.getItem('client_session');
        if (!session) return;
        const clientData = JSON.parse(session);

        try {
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.EVALUATIONS,
                [
                    Query.equal('clientId', clientData.clientId),
                    Query.orderDesc('createdAt')
                ]
            );

            // Enrich with guard names
            const historyWithNames = await Promise.all(response.documents.map(async (doc: any) => {
                let guardName = doc.guardId;
                try {
                    const guardDoc = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS, [
                        Query.equal('guardId', doc.guardId)
                    ]);
                    if (guardDoc.documents.length > 0) {
                        guardName = guardDoc.documents[0].name;
                    }
                } catch (e) {
                    // ignore
                }
                return { ...doc, guardName };
            }));

            setHistory(historyWithNames);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const handleGuardSelect = (guardId: string) => {
        setSelectedGuardId(guardId);
        const guard = guards.find(g => g.id === guardId);
        setSelectedGuard(guard || null);
    };

    const handleLogout = () => {
        localStorage.removeItem('client_session');
        navigate('/');
    };

    const handleScoreChange = (kpiId: string, value: string) => {
        setScores(prev => ({ ...prev, [kpiId]: Number(value) }));
    };

    const handleRemarksChange = (kpiId: string, value: string) => {
        setRemarks(prev => ({ ...prev, [kpiId]: value }));
    };

    const calculateTotalPoints = () => {
        return Object.values(scores).reduce((a, b) => a + b, 0);
    };

    const getRecommendation = (total: number) => {
        if (total >= 10) return { action: 'SEPARATION', color: 'text-red-500', icon: UserMinus };
        if (total >= 7) return { action: 'FINAL WRITE-UP', color: 'text-orange-500', icon: FileWarning };
        if (total >= 3) return { action: 'WARNING', color: 'text-yellow-500', icon: AlertTriangle };
        return { action: 'GOOD STANDING', color: 'text-green-500', icon: null };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedGuard) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Guard Required',
                message: 'Please select a guard to evaluate.'
            });
            return;
        }

        if (!evaluatorSignature.trim()) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Signature Required',
                message: 'Please provide your digital signature.'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Check for duplicate evaluation (same guard, same date)
            const existingDocs = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.EVALUATIONS,
                [
                    Query.equal('guardId', selectedGuard.guardId)
                ]
            );

            // Filter client-side by date (check if any evaluation was created on the same date)
            const todayEvaluations = existingDocs.documents.filter((doc: any) => {
                const docDate = new Date(doc.createdAt).toISOString().split('T')[0];
                return docDate === evaluationDate;
            });

            if (todayEvaluations.length > 0) {
                setNotification({
                    isOpen: true,
                    type: 'error',
                    title: 'Duplicate Evaluation',
                    message: `An evaluation for ${selectedGuard.name} already exists for ${evaluationDate}. Only one evaluation per guard per day is allowed.`
                });
                setIsSubmitting(false);
                return;
            }

            const totalPoints = calculateTotalPoints();

            const payload = {
                clientId: clientSession?.clientId || '',
                guardId: selectedGuard.guardId,
                kpi_scores: JSON.stringify({
                    ...scores,
                    remarks: remarks,
                    evaluatorName: clientSession?.name || clientSession?.representativeName || '',
                    clientName: clientSession?.name,
                    representativeName: clientSession?.representativeName,
                    evaluatorSignature: evaluatorSignature
                }),
                totalScore: totalPoints,
                createdAt: new Date().toISOString(),
                editableUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
            };

            await databases.createDocument(
                DB_ID,
                COLLECTIONS.EVALUATIONS,
                ID.unique(),
                payload,
                [Permission.read(Role.any()), Permission.write(Role.any())]
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Evaluation Submitted',
                message: `Successfully recorded evaluation for ${selectedGuard.name}. Total Penalty Points: ${totalPoints}`
            });

            // Refresh history
            fetchHistory();

            // Reset form
            setSelectedGuardId('');
            setSelectedGuard(null);
            setEvaluatorSignature('');
            const initialScores: Record<string, number> = {};
            const initialRemarks: Record<string, string> = {};
            KPI_CATEGORIES.forEach(cat => {
                initialScores[cat.id] = 0;
                initialRemarks[cat.id] = '';
            });
            setScores(initialScores);
            setRemarks(initialRemarks);

        } catch (error: any) {
            console.error('Submission failed:', error);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: error.message || 'Failed to submit evaluation.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentTotal = calculateTotalPoints();
    const recommendation = getRecommendation(currentTotal);
    const RecIcon = recommendation.icon;

    if (!clientSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-dark-700">
                        <img
                            src="https://spadesecurityservices.com/wp-content/uploads/2025/06/SSS-Spade-Security-Brand-Logos-V1_3.-Landscape-logo-White-W-Strapline-1024x242.webp"
                            alt="Spade Logo"
                            className="w-full h-auto"
                        />
                    </div>

                    {/* User Info */}
                    <div className="p-4 border-b border-dark-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-gold-500" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{clientSession.name}</p>
                                <p className="text-gray-500 text-xs">{clientSession.representativeName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('evaluate')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'evaluate' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}
                        >
                            <ClipboardList className="w-5 h-5" />
                            Evaluate Guard
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-gold-500/20 text-gold-500' : 'text-gray-400 hover:bg-dark-700'}`}
                        >
                            <BarChart3 className="w-5 h-5" />
                            Evaluation History
                        </button>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-dark-700">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Close button for mobile */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 lg:hidden text-gray-400"
                >
                    <X className="w-6 h-6" />
                </button>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden bg-dark-800 border-b border-dark-700 p-4 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6 text-gray-400" />
                    </button>
                    <h1 className="text-white font-bold">Performance Hub</h1>
                    <div className="w-6" />
                </header>

                <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                    {activeTab === 'evaluate' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Header Section with Guard Select and Date */}
                            <Card className="p-6 bg-dark-800/50 border-gold-500/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Guard Select */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                            <UserIcon className="w-4 h-4" />
                                            Select Guard
                                        </label>
                                        <select
                                            value={selectedGuardId}
                                            onChange={(e) => handleGuardSelect(e.target.value)}
                                            className="w-full bg-dark-900 text-white p-3 rounded-lg border border-dark-700 focus:border-gold-500 outline-none"
                                            required
                                        >
                                            <option value="">Choose a guard...</option>
                                            {guards.map(guard => (
                                                <option key={guard.id} value={guard.id}>
                                                    {guard.name} ({guard.guardId})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Evaluation Date
                                        </label>
                                        <input
                                            type="date"
                                            value={evaluationDate}
                                            onChange={(e) => setEvaluationDate(e.target.value)}
                                            className="w-full bg-dark-900 text-white p-3 rounded-lg border border-dark-700 focus:border-gold-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Live Score Display */}
                                {selectedGuard && (
                                    <div className="mt-6 pt-6 border-t border-dark-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Evaluating: {selectedGuard.name}</h2>
                                            <p className="text-gray-500 text-sm">Guard ID: {selectedGuard.guardId}</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-dark-900 p-3 rounded-lg">
                                            <div className="text-right">
                                                <span className={`text-2xl font-bold ${currentTotal === 0 ? 'text-green-500' : 'text-gold-500'}`}>
                                                    {currentTotal}
                                                </span>
                                                <span className="text-gray-500 text-xs block">PENALTY POINTS</span>
                                            </div>
                                            <div className="h-10 w-px bg-dark-700" />
                                            <div className={`flex items-center gap-2 font-bold ${recommendation.color}`}>
                                                {RecIcon && <RecIcon className="w-5 h-5" />}
                                                {recommendation.action}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* KPI Categories with Remarks */}
                            {selectedGuard && (
                                <div className="space-y-4">
                                    {KPI_CATEGORIES.map((kpi) => (
                                        <Card key={kpi.id} className="p-5 bg-dark-800/50 border-dark-700 hover:border-gold-500/30 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gold-400">{kpi.label}</h3>
                                                    <p className="text-sm text-gray-500">{kpi.description}</p>
                                                </div>
                                                <div className="bg-dark-900 px-3 py-1 rounded text-sm font-mono text-gray-300">
                                                    {scores[kpi.id]} pts
                                                </div>
                                            </div>

                                            {/* Score Select */}
                                            <select
                                                value={scores[kpi.id]}
                                                onChange={(e) => handleScoreChange(kpi.id, e.target.value)}
                                                className="w-full bg-dark-900 text-white p-3 rounded-lg border border-dark-700 focus:border-gold-500 outline-none mb-3"
                                            >
                                                {kpi.options.map((opt, idx) => (
                                                    <option key={idx} value={opt.points}>
                                                        {opt.points} pts - {opt.label}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Remarks */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Remarks (optional)</label>
                                                <textarea
                                                    value={remarks[kpi.id]}
                                                    onChange={(e) => handleRemarksChange(kpi.id, e.target.value)}
                                                    placeholder="Add any additional notes or observations..."
                                                    className="w-full bg-dark-900 text-white p-3 rounded-lg border border-dark-700 focus:border-gold-500 outline-none resize-none h-20"
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Signature & Submit */}
                            {selectedGuard && (
                                <Card className="p-6 bg-dark-800/50 border-gold-500/20">
                                    <h3 className="text-lg font-bold text-white mb-4">Certification</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-sm font-medium text-gray-400 block mb-2">Evaluator Name</label>
                                            <div className="bg-dark-900 text-gray-300 p-3 rounded-lg border border-dark-700">
                                                {clientSession.name}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gold-400 block mb-2">Digital Signature</label>
                                            <Input
                                                value={evaluatorSignature}
                                                onChange={(e) => setEvaluatorSignature(e.target.value)}
                                                placeholder={`Type your name to sign`}
                                                className="bg-dark-900 border-dark-700"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <Button
                                            type="submit"
                                            className="px-8 py-3 bg-gold-500 text-dark-900 font-bold hover:bg-gold-400"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </form>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Evaluation History</h2>

                            {history.length === 0 ? (
                                <Card className="p-8 text-center bg-dark-800/50 border-dark-700">
                                    <p className="text-gray-500">No evaluations submitted yet.</p>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <div
                                            key={item.$id}
                                            onClick={() => navigate(`/client/evaluation/${item.$id}`)}
                                            className="group flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 border border-dark-700 hover:border-gold-500/30 rounded-lg cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-dark-900 rounded-lg flex items-center justify-center font-bold text-gold-500">
                                                    {item.totalScore}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{item.guardName}</p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span>{item.guardId}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const rec = getRecommendation(item.totalScore);
                                                    return (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded bg-dark-900 ${rec.color} border border-dark-700`}>
                                                            {rec.action}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Notification Modal */}
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
