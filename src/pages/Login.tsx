import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { account, databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { NotificationModal } from '@/components/ui/NotificationModal';
import { Lock, User } from 'lucide-react';

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'admin-john',
    password: '1234',
    role: 'admin'
};

export default function Login() {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ isOpen: false, type: 'error' as const, title: '', message: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const trimmedIdentifier = identifier.trim();

            // 1. Check hardcoded admin credentials first
            if (trimmedIdentifier === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                localStorage.setItem('admin_session', JSON.stringify({
                    username: ADMIN_CREDENTIALS.username,
                    role: ADMIN_CREDENTIALS.role,
                    loggedInAt: new Date().toISOString()
                }));
                navigate('/admin');
                return;
            }

            // 2. Attempt Admin Login (Appwrite Auth)
            const authAttempts: string[] = [];
            const isEmail = trimmedIdentifier.includes('@');

            if (isEmail) {
                authAttempts.push(trimmedIdentifier);
            } else {
                authAttempts.push(`${trimmedIdentifier.toLowerCase()}@spadesecurityservices.com`);
                authAttempts.push(trimmedIdentifier);
            }

            for (const authEmail of authAttempts) {
                try {
                    try {
                        await account.deleteSession('current');
                    } catch (e) {
                        // Ignore
                    }

                    console.log('Attempting admin login with:', authEmail);
                    await account.createEmailPasswordSession(authEmail, password);
                    navigate('/admin');
                    return;
                } catch (authError: any) {
                    if (authError?.code === 429 || authError?.message?.includes('429') || authError?.message?.includes('Too Many')) {
                        throw new Error('Too many login attempts. Please wait 5-10 minutes before trying again.');
                    }
                    console.log(`Auth attempt with ${authEmail} failed, trying next...`);
                }
            }

            // 3. Attempt Client Login (Database)
            console.log("All admin auth attempts failed, trying client login...");

            let clientDocs = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [Query.equal('clientId', identifier)]);

            if (clientDocs.total === 0) {
                clientDocs = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [Query.equal('name', identifier)]);
            }

            if (clientDocs.total > 0) {
                const clientData = clientDocs.documents[0];
                if (clientData.password === password) {
                    localStorage.setItem('client_session', JSON.stringify(clientData));
                    navigate('/client');
                    return;
                }
            }

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
