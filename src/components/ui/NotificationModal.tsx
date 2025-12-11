import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface NotificationModalProps {
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
    isOpen,
    type,
    title,
    message,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 border-dark-700 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                        <p className="text-gray-400">{message}</p>
                    </div>

                    <Button
                        variant={type === 'success' ? 'primary' : 'outline'}
                        className="w-full mt-2"
                        onClick={onClose}
                    >
                        {type === 'success' ? 'Continue' : 'Try Again'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
