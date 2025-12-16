import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { account, databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { Lock, User } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string; // Added title back
        message: string;
    }>({
        isOpen: false,
        type: 'error', // Default to error
        title: '',
        message: '',
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const trimmedIdentifier = identifier.trim();
            let authEmail = trimmedIdentifier;

            // 1. Resolve Identifier to Email
            const isEmail = trimmedIdentifier.includes('@');

            if (!isEmail) {
                // Determine if it's likely a Client ID or Name, or Admin Username
                // Strategy: Check Clients collection first to see if this matches a client
                try {
                    const clientByCode = await databases.listDocuments(
                        DB_ID,
                        COLLECTIONS.CLIENTS,
                        [Query.equal('clientId', trimmedIdentifier)]
                    );

                    if (clientByCode.total > 0 && clientByCode.documents[0].email) {
                        authEmail = clientByCode.documents[0].email;
                        console.log("Resolved Client ID to email:", authEmail);
                    } else {
                        // Check by Name
                        const clientByName = await databases.listDocuments(
                            DB_ID,
                            COLLECTIONS.CLIENTS,
                            [Query.equal('name', trimmedIdentifier)]
                        );

                        if (clientByName.total > 0 && clientByName.documents[0].email) {
                            authEmail = clientByName.documents[0].email;
                            console.log("Resolved Client Name to email:", authEmail);
                        } else {
                            // Default to Admin/Generic email construction
                            // If identifier is simple text like 'john', assume admin domain
                            authEmail = `${trimmedIdentifier.toLowerCase()}@spadesecurityservices.com`;
                            console.log("Constructed fallback email:", authEmail);
                        }
                    }
                } catch (err) {
                    console.warn("Error resolving identifier:", err);
                    // Fallback to construction
                    authEmail = `${trimmedIdentifier.toLowerCase()}@spadesecurityservices.com`;
                }
            }

            // 2. Clear existing session if any
            try {
                await account.deleteSession('current');
            } catch (e) {
                // No session to delete
            }

            // 3. Attempt Appwrite Login
            console.log('Attempting login with:', authEmail);
            await account.createEmailPasswordSession(authEmail, password);

            // 4. Determine Role & Route
            const user = await account.get();
            console.log("Authenticated User:", user);

            // Logic to distinguish Admin vs Client
            // Assumption: Admins have specific emails or labels.
            // For now, checks if email matches admin pattern or if NOT found in Clients collection.

            // Try to find client profile
            const clientMatch = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.equal('email', authEmail)]
            );

            if (clientMatch.total > 0) {
                // It is a Client
                const clientData = clientMatch.documents[0];
                localStorage.setItem('client_session', JSON.stringify(clientData));
                navigate('/client');
            } else {
                // Assume Admin
                // Ideally, verify admin label/team. For now, default to Admin dashboard if auth passed and not a known client.
                localStorage.setItem('admin_session', JSON.stringify({
                    username: user.name || user.email,
                    role: 'admin',
                    loggedInAt: new Date().toISOString()
                }));
                navigate('/admin');
            }

        } catch (error: any) {
            console.error("Login Error Details:", error);
            let msg = 'Invalid Credentials';
            if (error?.message?.includes('Rate limit')) {
                msg = 'Too many attempts. Please wait a moment.';
            } else if (error?.type === 'user_invalid_credentials') {
                msg = 'Invalid username or password.';
            }

            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Login Failed', // Added title
                message: msg
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-gray-100">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#1a2222_0%,_#0A0F0A_100%)] -z-10" />

            <Card className="w-full max-w-md p-8 border-gold-500/20 bg-dark-800/80 backdrop-blur-md">
                <div className="text-center mb-8">
                    <img src="https://spadesecurityservices.com/wp-content/uploads/2025/06/SSS-Spade-Security-Brand-Logos-V1_3.-Landscape-logo-White-W-Strapline-1024x242.webp" alt="Spade Logo" className="w-48 h-auto mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                    <p className="text-gray-400">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <div className="relative">
                            <User className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
                            <Input
                                placeholder="Username, Email, or Client ID"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="pl-14 input-field"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-14 input-field"
                                required
                            />
                        </div>
                    </div>

                    <Button className="w-full bg-gold-500 text-dark-900 font-bold hover:bg-gold-400 py-3" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </form>
            </Card>

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
