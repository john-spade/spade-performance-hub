import React, { useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, Star, Calendar, ClipboardList } from 'lucide-react';

interface GuardProfileProps {
    guardId: string;
    guardName: string;
    onBack: () => void;
}

export default function GuardProfile({ guardId, guardName, onBack }: GuardProfileProps) {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        averageScore: 0,
        totalEvals: 0,
        highestScore: 0,
        lowestScore: 0
    });

    useEffect(() => {
        const fetchGuardData = async () => {
            try {
                // Fetch all evaluations for this guard
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
                    const totalScore = evals.reduce((acc: number, curr: any) => acc + (curr.totalScore || 0), 0);
                    const scores = evals.map((e: any) => e.totalScore || 0);

                    setStats({
                        averageScore: Number((totalScore / evals.length).toFixed(1)),
                        totalEvals: evals.length,
                        highestScore: Math.max(...scores),
                        lowestScore: Math.min(...scores)
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

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 70) return 'text-gold-500';
        return 'text-red-400';
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
                    <p className="text-gray-400 text-xs uppercase font-bold">Average Score</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Star className="w-5 h-5 text-gold-500" />
                        <span className="text-2xl font-bold text-white">{stats.averageScore}</span>
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
                    <p className="text-gray-400 text-xs uppercase font-bold">Highest Score</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-bold text-green-400">{stats.highestScore}</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-500">
                    <p className="text-gray-400 text-xs uppercase font-bold">Lowest Score</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-bold text-red-400">{stats.lowestScore}</span>
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
                                <th className="p-4">Total Score</th>
                                <th className="p-4">Appearance</th>
                                <th className="p-4">Attendance</th>
                                <th className="p-4">Alertness</th>
                                <th className="p-4">Communication</th>
                                <th className="p-4">Attitude</th>
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
                                            <span className={`font-bold text-lg ${getScoreColor(ev.totalScore)}`}>
                                                {ev.totalScore}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400">{ev.scores.appearance || '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.attendance || '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.alertness || '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.communication || '-'}</td>
                                        <td className="p-4 text-gray-400">{ev.scores.attitude || '-'}</td>
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
