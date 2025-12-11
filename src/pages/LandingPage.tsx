import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { GuardSearch } from '../components/forms/GuardSearch';
import EvaluationForm from '../components/forms/EvaluationForm';
import { databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { Query } from 'appwrite';
import { NotificationModal } from '../components/ui/NotificationModal';

interface LandingPageProps {
    onViewChange: (view: any) => void;
}

export default function LandingPage({ onViewChange }: LandingPageProps) {
    const [clientId, setClientId] = useState('');
    const [isClientVerified, setIsClientVerified] = useState(false);
    const [selectedGuard, setSelectedGuard] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const handleVerifyClient = async () => {
        const term = clientId.trim();
        if (!term) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Input Required',
                message: 'Please enter a Client ID or Company Name.'
            });
            return;
        }

        setIsVerifying(true);
        try {
            // First try finding by Client ID
            let response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.equal('clientId', term)]
            );

            // If not found, try finding by Name
            if (response.documents.length === 0) {
                response = await databases.listDocuments(
                    DB_ID,
                    COLLECTIONS.CLIENTS,
                    [Query.equal('name', term)]
                );
            }

            if (response.documents.length > 0) {
                const doc = response.documents[0];
                // Success - Verification Matched
                setIsClientVerified(true);
                setClientId(doc.clientId); // Auto-correct the input to the official Client ID

                setNotification({
                    isOpen: true,
                    type: 'success',
                    title: 'Verification Successful',
                    message: `Welcome, ${doc.name} (${doc.clientId}). You may now proceed.`
                });
            } else {
                // Not Found
                setNotification({
                    isOpen: true,
                    type: 'error',
                    title: 'Verification Failed',
                    message: 'No client found with that ID or Name.'
                });
            }
        } catch (error: any) {
            console.error(error);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'System Error',
                message: `Could not verify client: ${error.message}`
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleEvaluationSubmit = (data: any) => {
        console.log('Submitting:', data);
        setSelectedGuard(null);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_#1a2222_0%,_#0A0F0A_50%)] -z-10" />

            <div className="w-full max-w-3xl space-y-8 relative z-10">

                {/* Header */}
                <div className="text-center space-y-4">
                    <img src="https://spadesecurityservices.com/wp-content/uploads/2025/06/SSS-Spade-Security-Brand-Logos-V1_3.-Landscape-logo-White-W-Strapline-1024x242.webp" alt="Spade Logo" className="w-64 h-auto mx-auto mb-4" />
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                        SPADE <span className="text-gold-500">PERFORMANCE</span> HUB
                    </h1>
                    <p className="text-xl text-gray-400">Security Guard Evaluation System</p>
                </div>

                {/* Main Interface */}
                {!selectedGuard ? (
                    <Card className="p-8 backdrop-blur-md bg-dark-800/80 border-gold-500/10">
                        <div className="space-y-6">
                            {/* Client ID Section */}
                            <div>
                                <h3 className="text-lg font-medium text-white mb-4">1. Client Verification</h3>
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Enter Client ID or Company Name"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        disabled={isClientVerified}
                                    />
                                    {!isClientVerified ? (
                                        <Button onClick={handleVerifyClient} disabled={isVerifying}>
                                            {isVerifying ? 'Verifying...' : 'Verify'}
                                        </Button>
                                    ) : (
                                        <Button variant="outline" onClick={() => setIsClientVerified(false)}>Change</Button>
                                    )}
                                </div>
                            </div>

                            {/* Guard Search Section */}
                            <div className={`transition-opacity duration-500 ${isClientVerified ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <h3 className="text-lg font-medium text-white mb-4">2. Select Security Guard</h3>
                                <GuardSearch
                                    onSelect={setSelectedGuard}
                                    disabled={!isClientVerified}
                                />
                            </div>
                        </div>
                    </Card>
                ) : (
                    <EvaluationForm
                        guardName={selectedGuard.name}
                        guardId={selectedGuard.guardId}
                        clientId={clientId} // Pass verified Client ID
                        onSubmit={handleEvaluationSubmit}
                    />
                )}
            </div>

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
