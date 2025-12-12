import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './lib/auth';
import ErrorBoundary from './components/ErrorBoundary';
import { LogOut, User } from 'lucide-react';
import { account } from './lib/appwrite';

// Valid routes in the application
const VALID_ROUTES = ['/', '/signin', '/admin', '/client'];

function MainApp() {
    const { user, loading } = useAuth();
    // Simple currentView state: 'landing' | 'signin' | 'admin' | 'client' | 'notfound'
    const [currentView, setCurrentView] = useState<string>('landing');
    const [clientData, setClientData] = useState<any>(null);

    // Check URL path on load
    useEffect(() => {
        const path = window.location.pathname;

        // Check if it's a valid route
        if (!VALID_ROUTES.includes(path)) {
            setCurrentView('notfound');
            return;
        }

        if (path === '/signin') {
            setCurrentView('signin');
        } else if (path === '/admin') {
            // Only allow if actually logged in
            if (user) {
                setCurrentView('admin');
            } else if (!loading) {
                // Not logged in, redirect to signin
                window.history.pushState({}, '', '/signin');
                setCurrentView('signin');
            }
        } else if (path === '/client') {
            setCurrentView('client');
        } else if (path === '/') {
            setCurrentView('landing');
        } else {
            setCurrentView('notfound');
        }
    }, [user, loading]);

    const handleLoginSuccess = (role: 'admin' | 'client', data?: any) => {
        if (role === 'admin') {
            window.history.pushState({}, '', '/admin');
            setCurrentView('admin');
        } else {
            window.history.pushState({}, '', '/client');
            setClientData(data);
            setCurrentView('client');
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
        } catch (e) {
            // Ignore if already logged out
        }
        setClientData(null);
        window.history.pushState({}, '', '/signin');
        setCurrentView('signin');
    };

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        setCurrentView('landing');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

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
            {currentView === 'notfound' && <NotFound onGoHome={handleGoHome} />}
        </div>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <MainApp />
            </AuthProvider>
        </ErrorBoundary>
    );
}

