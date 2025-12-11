import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { account, databases, DB_ID, COLLECTIONS } from '../lib/appwrite';
import { Query } from 'appwrite';
import { NotificationModal } from '../components/ui/NotificationModal';
import { Lock, User } from 'lucide-react';

interface SignInProps {
    onLoginSuccess: (role: 'admin' | 'client', data?: any) => void;
}

export default function SignIn({ onLoginSuccess }: SignInProps) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ isOpen: false, type: 'error' as const, title: '', message: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Attempt Admin Login (Appwrite Auth)
            try {
                // Clear any existing stale session first
                try {
                    await account.deleteSession('current');
                } catch (e) {
                    // Ignore - no session to delete
                }

                // Handle "admin" shortcut
                let authIdentifier = identifier.trim();

                if (authIdentifier.toLowerCase() === 'admin') {
                    // Hardcoded mapping for the main admin account as requested
                    authIdentifier = 'john@spadesecurityservices.com';
                }

                // Appwrite handles non-emails gracefully enough, but we use the mapped one if needed.
                await account.createEmailPasswordSession(authIdentifier, password);
                // If successful
                onLoginSuccess('admin');
                return;
            } catch (authError: any) {
                // Check if it's a rate limit error
                if (authError?.code === 429 || authError?.message?.includes('429') || authError?.message?.includes('Too Many')) {
                    throw new Error('Too many login attempts. Please wait 5-10 minutes before trying again.');
                }
                // Continue to try Client login if Auth fails
                // console.log("Not an admin or wrong password");
            }

            // 2. Attempt Client Login (Database)
            // Search by clientId OR name
            const queries = [
                Query.equal('clientId', identifier),
            ];

            // We can't do OR query directly easily across different fields in one go without permissions set up perfectly or complex queries
            // So we'll try ID first, then Name if needed.

            let clientDocs = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [Query.equal('clientId', identifier)]);

            if (clientDocs.total === 0) {
                clientDocs = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [Query.equal('name', identifier)]);
            }

            if (clientDocs.total > 0) {
                const clientData = clientDocs.documents[0];
                if (clientData.password === password) {
                    onLoginSuccess('client', clientData);
                    return;
                }
            }

            // If we get here, neither worked
            throw new Error('Invalid Credentials');

        } catch (error: any) {
            console.error("Login Error Details:", error);
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Login Failed',
                message: error.message || 'Invalid email/ID or password. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
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
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <Input
                                placeholder="Email, Client ID, or Company Name"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
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
