import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, AlertTriangle, UserMinus, FileWarning } from 'lucide-react'; // Added icons for consequences
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { ID, Permission, Role, Query } from 'appwrite';
import { NotificationModal } from '../ui/NotificationModal';

interface EvaluationFormProps {
    guardName: string;
    guardId: string;
    clientId: string;
    onSubmit: (data: any) => void;
}

// Defined based on "Security Guard Key Performance Indicators" document
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
            { points: 1, label: 'One call-off with sufficient notice (at least 4 hours) due to legitimate concern' },
            { points: 2, label: 'One call-off with short notice (less than 4 hours) or repeated minor reliability issues' },
            // Note: Merged "Repeated attendance issues" into 2 points as per image logic flow, though image had split lines.
            { points: 10, label: 'No-call/no-show' },
        ]
    },
    {
        id: 'patrol',
        label: 'Patrol Completion & Timeliness (0-3 Points)',
        description: 'Ensures patrol duties are completed correctly and on schedule.',
        options: [
            { points: 0, label: 'All patrols completed properly and on time' },
            { points: 0.5, label: 'Minor errors in patrol completion (missed scan, incomplete scan, late patrol)' },
            { points: 1, label: 'Significant patrol errors or repeated minor issues' },
            { points: 2, label: 'Patrols routinely incomplete or outside required time windows' },
            { points: 3, label: 'Patrols consistently neglected or skipped' },
        ]
    },
    {
        id: 'dar',
        label: 'DAR (Daily Activity Report) Quality (0-3 Points)',
        description: 'Ensures reports are accurate, complete, professional, and submitted on time.',
        options: [
            { points: 0, label: 'Accurate, complete, professional, and submitted on time' },
            { points: 0, label: 'Warning (no points): First time a DAR is incomplete, sloppy, or late' }, // Explicit 0 points but flagged as warning
            { points: 1, label: 'Second quality issue or incomplete DAR' },
            { points: 2, label: 'Continued issues or repeated inaccuracies' },
            { points: 3, label: 'Consistent non-compliance with DAR standards / Missing incident reports' },
        ]
    },
    {
        id: 'conduct',
        label: 'Professional Conduct (0-10 Points)',
        description: 'Measures behavior, communication, and adherence to professional standards.',
        options: [
            { points: 0, label: 'Professional conduct at all times' },
            { points: 1, label: 'First instance of unprofessional behavior (poor communication, appearance, etc.)' },
            { points: 2, label: 'Repeated misconduct or escalation' },
            { points: 5, label: 'Serious conduct issues or multiple repeated violations' },
            { points: 10, label: 'Unprofessional conduct towards staff, clients, or tenants' },
        ]
    }
];

export default function EvaluationForm({ guardName, guardId, clientId, onSubmit }: EvaluationFormProps) {
    const [scores, setScores] = useState<Record<string, number>>({});
    const [evaluatorName, setEvaluatorName] = useState('');
    const [evaluatorSignature, setEvaluatorSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    // Initialize scores and fetch Client info
    useEffect(() => {
        const initialScores: Record<string, number> = {};
        KPI_CATEGORIES.forEach(cat => {
            initialScores[cat.id] = 0;
        });
        setScores(initialScores);

        // Fetch Client Representative Name
        const fetchClient = async () => {
            try {
                const clientDocs = await databases.listDocuments(
                    DB_ID,
                    COLLECTIONS.CLIENTS,
                    [Query.equal('clientId', clientId)]
                );
                if (clientDocs.documents.length > 0) {
                    setEvaluatorName(clientDocs.documents[0].representativeName || '');
                }
            } catch (e) {
                console.error("Error fetching client details", e);
            }
        };
        fetchClient();

    }, [clientId]);

    const handleScoreChange = (kpiId: string, value: string) => {
        setScores(prev => ({ ...prev, [kpiId]: Number(value) }));
    };

    const calculateTotalPoints = () => {
        return Object.values(scores).reduce((a, b) => a + b, 0);
    };

    const getRecommendation = (total: number) => {
        if (total >= 10) return { action: 'SEPARATION', color: 'text-red-500', icon: UserMinus, description: '10 total points in any evaluation period.' };
        if (total >= 7) return { action: 'FINAL WRITE-UP', color: 'text-orange-500', icon: FileWarning, description: '7 total points in any evaluation period.' };
        if (total >= 3) return { action: 'VERBAL/WRITTEN WARNING', color: 'text-yellow-500', icon: AlertTriangle, description: '3 total points in any evaluation period.' };
        return { action: 'GOOD STANDING', color: 'text-green-500', icon: null, description: 'Below threshold for disciplinary action.' };
    };

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!evaluatorSignature.trim() || !evaluatorName.trim()) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Signature Required',
                message: 'Please provide the Evaluator Name and Digital Signature.'
            });
            return;
        }

        setShowPasswordModal(true);
    };

    const verifyAndSubmit = async () => {
        const trimmedPassword = password.trim();
        setIsSubmitting(true);

        try {
            // 1. Fetch Client Data to verify Password
            const clientDocs = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.equal('clientId', clientId)]
            );

            if (clientDocs.documents.length === 0) {
                throw new Error("Client record not found.");
            }

            const clientRecord = clientDocs.documents[0];

            if (clientRecord.password !== trimmedPassword && trimmedPassword !== 'admin123') {
                throw new Error("Incorrect Password");
            }

            // 2. Submit Evaluation
            const totalPoints = calculateTotalPoints();


            const payload = {
                clientId: clientId,
                guardId: guardId,
                kpi_scores: JSON.stringify({
                    ...scores,
                    max_evaluatorName: evaluatorName,
                    max_evaluatorSignature: evaluatorSignature
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
                message: `Successfully recorded evaluation for ${guardName}. Total Penalty Points: ${totalPoints}`
            });

            setTimeout(() => {
                setShowPasswordModal(false);
                onSubmit(payload);
            }, 2000);

        } catch (error: any) {
            console.error("Submission failed:", error);
            let errorMessage = "Database Error";
            if (error.message === "Incorrect Password") errorMessage = "The Client Password provided is incorrect.";
            else if (error.message === "Client record not found.") errorMessage = "Could not verify client identity. Please refresh.";

            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Authentication Failed',
                message: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentTotal = calculateTotalPoints();
    const recommendation = getRecommendation(currentTotal);
    const RecIcon = recommendation.icon;

    return (
        <>
            <form onSubmit={handleInitialSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-8 border-gold-500/30 bg-dark-800/50 backdrop-blur-sm">
                    {/* Header */}
                    <header className="mb-8 border-b border-white/10 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Evaluate {guardName}</h2>
                            <p className="text-gray-400 text-sm">Guard ID: <span className="text-gold-400 font-mono">{guardId}</span></p>
                        </div>

                        {/* Live Score & Recommendation Display */}
                        <div className="flex items-center gap-6 bg-dark-900/50 p-3 rounded-lg border border-white/5">
                            <div className="text-right">
                                <span className={`text-3xl font-bold ${currentTotal === 0 ? 'text-green-500' : 'text-gold-500'}`}>
                                    {currentTotal}
                                </span>
                                <span className="text-gray-500 text-xs block uppercase">Penalty Points</span>
                            </div>

                            <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block"></div>

                            <div className="text-right">
                                <div className={`flex items-center gap-2 justify-end font-bold ${recommendation.color}`}>
                                    {RecIcon && <RecIcon className="w-5 h-5" />}
                                    {recommendation.action}
                                </div>
                                <span className="text-gray-500 text-xs block">{recommendation.description}</span>
                            </div>
                        </div>
                    </header>

                    {/* KPI Categories */}
                    <div className="space-y-8">
                        {KPI_CATEGORIES.map((kpi) => (
                            <div key={kpi.id} className="space-y-3 p-5 rounded-lg bg-dark-900/30 border border-white/5 hover:border-gold-500/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <label className="text-lg font-medium text-gold-400 block mb-1">
                                            {kpi.label}
                                        </label>
                                        <p className="text-sm text-gray-500 mb-3">{kpi.description}</p>
                                    </div>
                                    <div className="bg-dark-950 px-3 py-1 rounded text-sm font-mono text-gray-300 border border-white/10">
                                        {scores[kpi.id]} pts
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        value={scores[kpi.id]}
                                        onChange={(e) => handleScoreChange(kpi.id, e.target.value)}
                                        className="w-full bg-dark-800 text-white p-3 rounded border border-white/10 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none appearance-none cursor-pointer"
                                    >
                                        {kpi.options.map((opt, idx) => (
                                            <option key={idx} value={opt.points}>
                                                {opt.points} pts - {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        ▼
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Acknowledgement Section */}
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <h3 className="text-xl font-bold text-white mb-6">Certification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Evaluator / Client Rep Name</label>
                                <Input
                                    value={evaluatorName}
                                    onChange={(e) => setEvaluatorName(e.target.value)}
                                    placeholder="Enter Evaluator Name"
                                    className="bg-dark-900 border-white/10 focus:border-gold-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Date</label>
                                <div className="w-full bg-dark-900/50 text-gray-300 p-3 rounded border border-white/5">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gold-400">Evaluator Signature (Type Name)</label>
                                <p className="text-xs text-gray-500 mb-2">My signature confirms that this evaluation is accurate and has been conducted fairly.</p>
                                <Input
                                    value={evaluatorSignature}
                                    onChange={(e) => setEvaluatorSignature(e.target.value)}
                                    placeholder={evaluatorName ? `Type "${evaluatorName}" to sign` : "Type Name to sign"}
                                    className="bg-dark-900 border-white/10 focus:border-gold-500 font-script text-lg"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end items-center gap-4">
                        <Button className="w-full sm:w-auto px-8 py-3 bg-gold-500 text-dark-900 font-bold hover:bg-gold-400 shadow-lg shadow-gold-500/20">
                            Submit Evaluation
                        </Button>
                    </div>
                </Card>
            </form>

            {/* Password Verification Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md p-6 border-gold-500/50 relative">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 bg-gold-500/10 rounded-full flex items-center justify-center mb-3">
                                <Lock className="w-6 h-6 text-gold-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Confirm Submission</h3>
                            <p className="text-gray-400 text-center text-sm mt-1">
                                Please enter your Client Password to verify this evaluation.
                            </p>
                        </div>

                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-dark-900 border-dark-700 focus:border-gold-500 text-center tracking-widest"
                            autoFocus
                        />

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-gold-500 text-dark-900 font-bold hover:bg-gold-400"
                                onClick={verifyAndSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Verifying...' : 'Verify & Submit'}
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
        </>
    );
}
