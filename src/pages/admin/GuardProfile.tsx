import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { ArrowLeft, Shield, Calendar, User, FileText } from 'lucide-react';

interface Guard {
    id: string;
    name: string;
    guardId: string;
}

interface Evaluation {
    id: string;
    totalScore: number;
    createdAt: string;
    kpi_scores: string; // JSON string
    evaluatorName?: string;
    evaluatorSignature?: string;
}

export default function GuardProfile() {
    const navigate = useNavigate();
    const params = useParams();
    const guardId = params.id as string;

    const [guard, setGuard] = useState<Guard | null>(null);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGuardData = async () => {
            try {
                // Fetch basic guard info - using listDocuments to find by 'guardId' attribute, not document $id
                const guardRes = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS, [
                    Query.equal('guardId', guardId)
                ]);

                if (guardRes.documents.length === 0) {
                    console.error('Guard not found');
                    setIsLoading(false);
                    return;
                }

                const guardDoc = guardRes.documents[0];
                setGuard({
                    id: guardDoc.$id,
                    name: guardDoc.name,
                    guardId: guardDoc.guardId
                });

                // Fetch evaluations for this guard
                const evalsRes = await databases.listDocuments(DB_ID, COLLECTIONS.EVALUATIONS, [
                    Query.equal('guardId', guardId),
                    Query.orderDesc('createdAt')
                ]);

                // Improve: Fetch clients to dynamically map clientId to Name if evaluatorName is missing
                let clientMap: Record<string, string> = {};
                try {
                    const clientsRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS);
                    clientsRes.documents.forEach((doc: any) => {
                        // Map both document ID and clientId (just in case) to Name
                        clientMap[doc.$id] = doc.name;
                        clientMap[doc.clientId] = doc.name;
                    });
                } catch (e) {
                    console.error('Failed to fetch clients map', e);
                }

                const evalsList = evalsRes.documents.map((doc: any) => ({
                    id: doc.$id,
                    totalScore: doc.totalScore,
                    createdAt: doc.createdAt,
                    kpi_scores: doc.kpi_scores,
                    clientId: doc.clientId // Ensure we capture clientId
                }));

                // Parse KPI scores to get extra metadata if needed, but for list primarily need total and date
                const parsedEvals = evalsList.map(ev => {
                    try {
                        const parsed = JSON.parse(ev.kpi_scores);
                        // Fallback order: Saved Name -> Client Map Name -> Unknown
                        let displayedName = parsed.evaluatorName;
                        if (!displayedName || displayedName === 'Unknown') {
                            displayedName = clientMap[ev.clientId] || 'Unknown';
                        }

                        return {
                            ...ev,
                            evaluatorName: displayedName,
                            evaluatorSignature: parsed.evaluatorSignature
                        };
                    } catch (e) {
                        return { ...ev, evaluatorName: clientMap[ev.clientId] || 'Unknown' };
                    }
                });

                setEvaluations(parsedEvals);

            } catch (error) {
                console.error('Failed to fetch guard details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (guardId) {
            fetchGuardData();
        }
    }, [guardId]);

    const getRecommendation = (total: number) => {
        if (total >= 10) return { label: 'SEPARATION', color: 'text-red-500', bg: 'bg-red-500/10' };
        if (total >= 7) return { label: 'FINAL WRITE-UP', color: 'text-orange-500', bg: 'bg-orange-500/10' };
        if (total >= 3) return { label: 'WARNING', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
        return { label: 'GOOD STANDING', color: 'text-green-500', bg: 'bg-green-500/10' };
    };

    if (isLoading) {
        return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-400">Loading Profile...</div>;
    }

    if (!guard) {
        return (
            <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-400">Guard not found.</p>
                <Button onClick={() => navigate(-1)} className="bg-dark-800 text-white hover:bg-dark-700">Go Back</Button>
            </div>
        );
    }

    // Calculate aggregate stats
    const totalEvals = evaluations.length;
    const avgScore = totalEvals > 0
        ? (evaluations.reduce((sum, e) => sum + e.totalScore, 0) / totalEvals).toFixed(1)
        : '0.0';

    return (
        <div className="min-h-screen bg-dark-900 p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-dark-800 rounded-full hover:bg-dark-700 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Guard Profile</h1>
                        <p className="text-gray-500 text-sm">Detailed performance records</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-dark-800/50 border-gold-500/20 md:col-span-2">
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-dark-900 rounded-2xl flex items-center justify-center border border-dark-700">
                                <Shield className="w-10 h-10 text-gold-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{guard.name}</h2>
                                        <p className="text-gold-500 font-mono mt-1">{guard.guardId}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-gold-500/10 text-gold-500 rounded text-xs font-bold uppercase tracking-wider border border-gold-500/20">
                                        Active Duty
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                                        <p className="text-xs text-gray-500 mb-1">Position</p>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-600" /> Security Officer
                                        </p>
                                    </div>
                                    <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                                        <p className="text-xs text-gray-500 mb-1">Joined</p>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-600" /> 2024
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="p-6 bg-dark-800/50 border-dark-700 space-y-6">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Average Monthly Score</p>
                            <div className="flex items-end gap-2">
                                <span className={`text-4xl font-bold ${Number(avgScore) === 0 ? 'text-green-500' : Number(avgScore) < 3 ? 'text-gold-500' : 'text-red-500'}`}>
                                    {avgScore}
                                </span>
                                <span className="text-gray-500 text-sm mb-1">/ evaluation</span>
                            </div>
                        </div>
                        <div className="h-px bg-dark-700" />
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Evaluations</p>
                            <span className="text-2xl font-bold text-white">{totalEvals}</span>
                        </div>
                    </Card>
                </div>

                {/* Evaluation History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gold-500" />
                        Evaluation History
                    </h3>

                    {evaluations.length === 0 ? (
                        <Card className="p-8 bg-dark-800/30 border-dark-700 text-center">
                            <p className="text-gray-500">No evaluations recorded for this guard yet.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {evaluations.map((evalItem) => {
                                const rec = getRecommendation(evalItem.totalScore);
                                return (
                                    <Card key={evalItem.id} className="p-5 bg-dark-800/50 border-dark-700 hover:border-gold-500/30 transition-all group">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${rec.bg} ${rec.color}`}>
                                                    {evalItem.totalScore}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{new Date(evalItem.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                    <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                        Evaluated by {evalItem.evaluatorName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 pl-16 md:pl-0">
                                                <div className={`px-3 py-1 rounded text-xs font-bold ${rec.bg} ${rec.color}`}>
                                                    {rec.label}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
