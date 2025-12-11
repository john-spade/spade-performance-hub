import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import { AuthProvider, useAuth } from './lib/auth';
import { Shield, LayoutDashboard, LogOut, User } from 'lucide-react';
import { account } from './lib/appwrite';

function MainApp() {
    const { user, loading } = useAuth();
    // Simple currentView state: 'landing' | 'signin' | 'admin' | 'client'
    const [currentView, setCurrentView] = useState('landing');
    const [clientData, setClientData] = useState<any>(null);

    // Check URL path on load
    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/signin') {
            setCurrentView('signin');
        } else if (path === '/admin') {
            // Only allow if actually logged in (checked by AuthProvider usually, but simple check here)
            if (user) setCurrentView('admin');
            else setCurrentView('signin');
        } else if (path === '/client') {
            setCurrentView('client');
            // independent refresh note: clientData will be null here if refreshed. 
            // normally would persist to localStorage or re-fetch. 
            // For this task, we assume flow from login.
        } else {
            setCurrentView('landing');
        }
    }, [user]);

    const handleLoginSuccess = (role: 'admin' | 'client', data?: any) => {
        if (role === 'admin') {
            window.history.pushState({}, '', '/admin');
            setCurrentView('admin');
        } else {
            window.history.pushState({}, '', '/client');
            setClientData(data); // Store the fetched client document
            setCurrentView('client');
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
        } catch (e) {
            // Ignore if already logged out (client side session)
        }
        setClientData(null);
        window.history.pushState({}, '', '/signin');
        setCurrentView('signin');
    };

    if (loading) return <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-dark-900 font-sans text-gray-100">
            {/* Minimal Navigation for Demo/Dev */}
            <nav className="fixed bottom-4 right-4 z-50 flex gap-2">
                {currentView === 'landing' && (
                    <button onClick={() => { window.history.pushState({}, '', '/signin'); setCurrentView('signin'); }} className="bg-dark-800 p-2 rounded-full border border-gold-500/30 hover:bg-gold-500/20 transition-colors">
                        <User className="w-5 h-5 text-gold-500" />
                    </button>
                )}
                {(currentView === 'admin' || currentView === 'client') && (
                    <button onClick={handleLogout} className="bg-dark-800 p-2 rounded-full border border-red-500/30 hover:bg-red-500/20 transition-colors" title="Logout">
                        <LogOut className="w-5 h-5 text-red-400" />
                    </button>
                )}
            </nav>

            {currentView === 'landing' && <LandingPage onViewChange={() => { }} />}
            {currentView === 'signin' && <SignIn onLoginSuccess={handleLoginSuccess} />}
            {currentView === 'admin' && <AdminDashboard />}
            {currentView === 'client' && <ClientDashboard clientData={clientData} onLogout={handleLogout} />}
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}
