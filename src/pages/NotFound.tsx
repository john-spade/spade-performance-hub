import React from 'react';
import { Home, ArrowLeft, Shield } from 'lucide-react';

interface NotFoundProps {
    onGoHome?: () => void;
    onGoBack?: () => void;
}

export default function NotFound({ onGoHome, onGoBack }: NotFoundProps) {
    const handleGoHome = () => {
        if (onGoHome) {
            onGoHome();
        } else {
            window.location.href = '/';
        }
    };

    const handleGoBack = () => {
        if (onGoBack) {
            onGoBack();
        } else {
            window.history.back();
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* 404 Visual */}
                <div className="relative mb-8">
                    <div className="text-[150px] font-bold text-dark-800 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-gold-500/10 flex items-center justify-center">
                            <Shield className="w-12 h-12 text-gold-500" />
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                <p className="text-gray-400 mb-8">
                    The page you're looking for doesn't exist or you don't have permission to access it.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleGoBack}
                        className="flex items-center gap-2 px-6 py-3 bg-dark-800 text-white font-semibold rounded-lg border border-white/10 hover:bg-dark-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                    <button
                        onClick={handleGoHome}
                        className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-dark-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Home
                    </button>
                </div>
            </div>
        </div>
    );
}
