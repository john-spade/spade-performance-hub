import React, { useState } from 'react';
import { X, Building, Lock, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, clientId: string, type: string, password: string) => Promise<void>;
}

export function AddClientModal({ isOpen, onClose, onSave }: AddClientModalProps) {
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState('');
    const [type, setType] = useState('Corporate');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !clientId.trim() || !password.trim()) {
            setError('All fields are required');
            return;
        }

        setIsLoading(true);

        try {
            await onSave(name, clientId, type, password);
            // Reset form on success
            setName('');
            setClientId('');
            setType('Corporate');
            setPassword('');
        } catch (err: any) {
            setError(err.message || 'Failed to add client');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md bg-dark-800 border-dark-700 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-gold-500" />
                        Add New Client
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Client Name</label>
                        <Input
                            placeholder="e.g. Tech Corp HQ"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-dark-900 border-dark-700"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Client ID</label>
                        <Input
                            placeholder="e.g. TC-001"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="bg-dark-900 border-dark-700"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Client Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-dark-900 text-white p-3 rounded-lg border border-dark-700 focus:border-gold-500 outline-none"
                            disabled={isLoading}
                        >
                            <option value="Corporate">Corporate</option>
                            <option value="Residential">Residential</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Retail">Retail</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Access password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-dark-900 border-dark-700"
                            disabled={isLoading}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            className="bg-dark-700 text-gray-300 hover:bg-dark-600"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gold-500 text-dark-900 font-bold hover:bg-gold-400 min-w-[100px]"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Add Client'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
