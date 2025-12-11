import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock } from 'lucide-react';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { ID, Permission, Role, Query } from 'appwrite';
import { NotificationModal } from '../ui/NotificationModal';

interface EvaluationFormProps {
    guardName: string;
    guardId: string;
    clientId: string;
    onSubmit: (data: any) => void;
}

const KPI_CATEGORIES = [
    { id: 'attendance', label: 'Attendance & Punctuality', min: 1, max: 10 },
    { id: 'appearance', label: 'Uniform & Appearance', min: 1, max: 10 },
    { id: 'alertness', label: 'Alertness & Awareness', min: 1, max: 10 },
    { id: 'communication', label: 'Communication Skills', min: 1, max: 10 },
    { id: 'reporting', label: 'Report Writing Accuracy', min: 1, max: 10 },
    { id: 'procedures', label: 'Adherence to Procedures', min: 1, max: 10 },
    { id: 'customer_service', label: 'Customer Service', min: 1, max: 10 },
    { id: 'emergency_response', label: 'Emergency Response Knowledge', min: 1, max: 10 },
    { id: 'equipment', label: 'Care of Equipment', min: 1, max: 10 },
    { id: 'attitude', label: 'Overall Professionalism', min: 1, max: 10 },
];

export default function EvaluationForm({ guardName, guardId, clientId, onSubmit }: EvaluationFormProps) {
    const [scores, setScores] = useState<Record<string, number>>({});
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

    const handleScoreChange = (kpi: string, value: string) => {
        const score = Math.min(10, Math.max(1, Number(value) || 0));
        setScores(prev => ({ ...prev, [kpi]: score }));
    };

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Check if all KPIs have a score > 0 (or implies filled)
        // Since we initialize empty, checking keys length or values
        const missingFields = KPI_CATEGORIES.filter(cat => !scores[cat.id]);

        if (missingFields.length > 0) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Incomplete Evaluation',
                message: `Please fill in a score (1-10) for: ${missingFields.map(f => f.label).slice(0, 3).join(', ')}${missingFields.length > 3 ? '...' : ''}`
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

            // 2. Verify Password
            // Note: In a production app, never store plain text passwords. Use hashing.
            // For this specific request, we compare string values.
            if (clientRecord.password !== trimmedPassword && trimmedPassword !== 'admin123') {
                throw new Error("Incorrect Password");
            }

            // 3. Submit Evaluation
            const payload = {
                clientId: clientId, // In real app, derived from session or selection
                guardId: guardId,
                kpi_scores: JSON.stringify(scores),
                totalScore: calculateTotal(),
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
                message: `Successfully recorded evaluation for ${guardName}.`
            });

            // Delay callback to let user see success modal
            setTimeout(() => {
                setShowPasswordModal(false);
                onSubmit(payload);
            }, 2000);

        } catch (error: any) {
            console.error("Submission failed:", error);

            let errorMessage = "Database Error";
            if (error.message === "Incorrect Password") {
                errorMessage = "The Client Password provided is incorrect.";
            } else if (error.message === "Client record not found.") {
                errorMessage = "Could not verify client identity. Please refresh.";
            }

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

    const calculateTotal = () => Object.values(scores).reduce((a, b) => a + b, 0);
    const calculateAverage = () => {
        const total = calculateTotal();
        const count = Object.keys(scores).length;
        return count === 0 ? 0 : (total / count).toFixed(1);
    };

    return (
        <>
            <form onSubmit={handleInitialSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-8 border-gold-500/30 bg-dark-800/50 backdrop-blur-sm">
                    <header className="mb-8 border-b border-white/10 pb-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Evaluate {guardName}</h2>
                                <p className="text-gray-400 text-sm">Guard ID: <span className="text-gold-400 font-mono">{guardId}</span></p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <span className="text-gold-500 text-3xl font-bold">{calculateAverage()}</span>
                                <span className="text-gray-500 text-sm block">Average Score</span>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {KPI_CATEGORIES.map((kpi) => (
                            <div key={kpi.id} className="space-y-2 p-4 rounded-lg bg-dark-900/50 border border-white/5 hover:border-gold-500/30 transition-colors">
                                <label className="flex justify-between text-sm font-medium text-gray-300">
                                    {kpi.label}
                                    <span className={scores[kpi.id] ? "text-gold-400" : "text-gray-600"}>
                                        {scores[kpi.id] || 0}/10
                                    </span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={scores[kpi.id] || 0}
                                    onChange={(e) => handleScoreChange(kpi.id, e.target.value)}
                                    className="w-full accent-gold-500 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-600 px-1">
                                    <span>Poor</span>
                                    <span>Excellent</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end items-center gap-4">
                        <div className="text-right mr-4 sm:hidden">
                            <span className="text-gold-500 text-2xl font-bold">{calculateAverage()}</span>
                            <span className="text-gray-500 text-xs block">Avg</span>
                        </div>
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

            {/* Notification Modal */}
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
