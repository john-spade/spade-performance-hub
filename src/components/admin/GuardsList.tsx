import { useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import { Search, Plus, Trash2, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { NotificationModal } from '../ui/NotificationModal';

interface GuardsListProps {
    onSelectGuard?: (guardId: string, guardName: string) => void;
}

export default function GuardsList({ onSelectGuard }: GuardsListProps) {
    const [guards, setGuards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Add Guard State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newGuard, setNewGuard] = useState({ name: '', guardId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    useEffect(() => {
        fetchGuards();
    }, []);

    const fetchGuards = async () => {
        try {
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.GUARDS,
                [Query.limit(100), Query.orderDesc('$createdAt')] // Fetch last 100 for now
            );
            setGuards(response.documents);
        } catch (error) {
            console.error("Failed to fetch guards:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGuard = async () => {
        if (!newGuard.name || !newGuard.guardId) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Validation Error',
                message: 'Please fill in all fields'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Check uniqueness (Optional but good practice)
            const existing = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.GUARDS,
                [Query.equal('guardId', newGuard.guardId)]
            );

            if (existing.documents.length > 0) {
                throw new Error("A guard with this ID already exists.");
            }

            await databases.createDocument(
                DB_ID,
                COLLECTIONS.GUARDS,
                ID.unique(),
                {
                    name: newGuard.name,
                    guardId: newGuard.guardId,
                    createdAt: new Date().toISOString()
                }
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Success',
                message: 'Guard added successfully'
            });

            setIsAddModalOpen(false);
            setNewGuard({ name: '', guardId: '' });
            fetchGuards(); // Refresh list

        } catch (error: any) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to add guard'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGuard = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

        try {
            await databases.deleteDocument(DB_ID, COLLECTIONS.GUARDS, id);
            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Deleted',
                message: 'Guard removed successfully'
            });
            setGuards(guards.filter(g => g.$id !== id));
        } catch (error) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to delete guard'
            });
        }
    };

    // Filter Logic
    const filteredGuards = guards.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.guardId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl text-white font-bold flex items-center gap-2">
                        <Shield className="text-blue-500" />
                        Guards Master List
                    </h2>
                    <p className="text-gray-400 text-sm">Manage all security personnel active in the system.</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-gold-500 text-black hover:bg-gold-400 font-bold flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add New Guard
                </Button>
            </div>

            {/* Search Bar */}
            <Card className="p-4 bg-dark-800/50">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <Input
                        placeholder="Search by name or ID..."
                        className="pl-10 bg-dark-900 border-white/10 text-white h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden bg-dark-800/50 border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-dark-900 text-gray-400 text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-medium border-b border-white/5">Guard ID</th>
                            <th className="p-4 font-medium border-b border-white/5">Name</th>
                            <th className="p-4 font-medium border-b border-white/5">Join Date</th>
                            <th className="p-4 font-medium border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-300 divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Loading guards...</td></tr>
                        ) : filteredGuards.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No guards found matching your search.</td></tr>
                        ) : (
                            filteredGuards.map((guard) => (
                                <tr
                                    key={guard.$id}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => onSelectGuard?.(guard.guardId, guard.name)}
                                >
                                    <td className="p-4 font-mono text-blue-400">{guard.guardId}</td>
                                    <td className="p-4 font-medium text-white">{guard.name}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(guard.$createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent row click
                                                handleDeleteGuard(guard.$id, guard.name);
                                            }}
                                            className="text-gray-600 hover:text-red-500 transition-colors p-2"
                                            title="Delete Guard"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="p-4 border-t border-white/5 text-xs text-gray-500 flex justify-between">
                    <span>Showing {filteredGuards.length} records</span>
                    <span>Total: {guards.length}</span>
                </div>
            </Card>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md p-6 border-gold-500/30">
                        <h3 className="text-xl font-bold text-white mb-4">Add New Security Guard</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    value={newGuard.name}
                                    onChange={(e) => setNewGuard({ ...newGuard, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Guard ID (Unique)</label>
                                <Input
                                    placeholder="e.g. G-2024-001"
                                    value={newGuard.guardId}
                                    onChange={(e) => setNewGuard({ ...newGuard, guardId: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button
                                className="flex-1 bg-gold-500 text-black hover:bg-gold-400"
                                onClick={handleAddGuard}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Guard'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

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
