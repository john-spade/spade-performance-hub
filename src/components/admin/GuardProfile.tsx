import { useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, Star, ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';

interface GuardProfileProps {
    guardId: string;
    guardName: string;
    onBack: () => void;
}

export default function GuardProfile({ guardId, guardName, onBack }: GuardProfileProps) {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        averagePenalty: 0,
        totalEvals: 0,
        totalWarnings: 0,
        perfectScores: 0
    });

    useEffect(() => {
        const fetchGuardData = async () => {
            try {
                const response = await databases.listDocuments(
                    DB_ID,
                    COLLECTIONS.EVALUATIONS,
                    [
                        Query.equal('guardId', guardId),
                        Query.orderDesc('createdAt')
                    ]
                );

                const evals = response.documents.map((doc: any) => {
                    let scores: any = {};
                    try {
                        scores = JSON.parse(doc.kpi_scores);
                    } catch (e) {
                        // ignore
                    }
                    return { ...doc, scores };
                });

                setEvaluations(evals);

                // Calculate Stats
                if (evals.length > 0) {
                    const totalPenalty = evals.reduce((acc: number, curr: any) => acc + (curr.totalScore || 0), 0);
                    const scores = evals.map((e: any) => e.totalScore || 0);

                    // Count specific thresholds
                    const warnings = scores.filter((s: number) => s >= 3).length; // 3+ is worth noting
                    const perfects = scores.filter((s: number) => s === 0).length;

                    setStats({
                        averagePenalty: Number((totalPenalty / evals.length).toFixed(1)),
                        totalEvals: evals.length,
                        totalWarnings: warnings,
                        perfectScores: perfects
                    });
                }

            } catch (error) {
                console.error("Failed to fetch guard details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGuardData();
    }, [guardId]);

    // In Penalty System: 0 is Good (Green), High is Bad (Red)
    const getPenaltyColor = (score: number) => {
        if (score === 0) return 'text-green-400';
        if (score < 3) return 'text-gold-400'; // Minor issues
        if (score < 7) return 'text-orange-400'; // Warning Level
        return 'text-red-500'; // Serious/Separation Level
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="flex items-center text-gray-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-white">{guardName}</h2>
                    <p className="text-gray-400 text-sm font-mono">{guardId}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-gold-500">
                    <p className="text-gray-400 text-xs uppercase font-bold">Avg Penalty Points</p>
                    <div className="flex items-center gap-2 mt-2">
                        <AlertTriangle className="w-5 h-5 text-gold-500" />
                        <span className="text-2xl font-bold text-white">{stats.averagePenalty}</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <p className="text-gray-400 text-xs uppercase font-bold">Total Evaluations</p>
                    <div className="flex items-center gap-2 mt-2">
                        <ClipboardList className="w-5 h-5 text-blue-500" />
                        <span className="text-2xl font-bold text-white">{stats.totalEvals}</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                    <p className="text-gray-400 text-xs uppercase font-bold">Perfect Records (0 pts)</p>
                    <div className="flex items-center gap-2 mt-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-2xl font-bold text-green-400">{stats.perfectScores}</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-500">
                    <p className="text-gray-400 text-xs uppercase font-bold">Penalty Flags (3+ pts)</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Star className="w-5 h-5 text-red-500" />
                        <span className="text-2xl font-bold text-red-400">{stats.totalWarnings}</span>
                    </div>
                </Card>
            </div>

            {/* Evaluation History Table */}
            <Card className="bg-dark-800/50 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <h3 className="font-bold text-white">Evaluation History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-dark-900 text-gray-400">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Total Penalty</th>
                                <th className="p-4">Punctuality</th>
                                <th className="p-4">Attendance</th>
                                <th className="p-4">Patrol</th>
                                <th className="p-4">DAR</th>
                                <th className="p-4">Conduct</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading history...</td></tr>
                            ) : evaluations.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No evaluations recorded.</td></tr>
                            ) : (
                                evaluations.map((ev) => (
                                    <tr key={ev.$id} className="hover:bg-white/5">
                                        <td className="p-4 text-gray-300">
                                            {new Date(ev.createdAt).toLocaleDateString()}
                                            <div className="text-xs text-gray-500">
                                                {new Date(ev.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold text-lg ${getPenaltyColor(ev.totalScore)}`}>
                                                {ev.totalScore}
                                            </span>
                                            {ev.recommendation && (
                                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                                    {ev.recommendation}
                                                </div>
                                            )}
                                        </td>
                                        {/* New keys based on updated EvaluationForm */}
                                        <td className="p-4 text-gray-400">{ev.scores.punctuality !== undefined ? ev.scores.punctuality : '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.attendance !== undefined ? ev.scores.attendance : '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.patrol !== undefined ? ev.scores.patrol : '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.dar !== undefined ? ev.scores.dar : '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.conduct !== undefined ? ev.scores.conduct : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
