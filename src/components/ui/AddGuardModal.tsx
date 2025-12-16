import React, { useState } from 'react';
import { X, User, Shield } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';

interface AddGuardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, guardId: string) => Promise<void>;
}

export const AddGuardModal: React.FC<AddGuardModalProps> = ({
    isOpen,
    onClose,
    onSave
}) => {
    const [name, setName] = useState('');
    const [guardId, setGuardId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !guardId.trim()) {
            setError('All fields are required');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(name, guardId);
            onClose();
            setName('');
            setGuardId('');
        } catch (err) {
            console.error(err);
            setError('Failed to add guard. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 border-dark-700 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-gold-500" />
                        Add New Guard
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Enter the details for the new security personnel.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <Input
                                type="text"
                                placeholder="e.g. John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Guard ID</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <Input
                                type="text"
                                placeholder="e.g. SPG-001"
                                value={guardId}
                                onChange={(e) => setGuardId(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? 'Adding...' : 'Add Guard'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
