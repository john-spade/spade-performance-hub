import React, { useState, useEffect } from 'react';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import { Search, Plus, Trash2, Users, Key, Eye, EyeOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { NotificationModal } from '../ui/NotificationModal';

export default function ClientsList() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Add Client State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', clientId: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.limit(100), Query.orderDesc('$createdAt')]
            );
            setClients(response.documents);
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClient = async () => {
        if (!newClient.name || !newClient.clientId || !newClient.password) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Validation Error',
                message: 'All fields are required.'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Check uniqueness
            const existing = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.CLIENTS,
                [Query.equal('clientId', newClient.clientId)]
            );

            if (existing.documents.length > 0) {
                throw new Error("A client with this ID already exists.");
            }

            await databases.createDocument(
                DB_ID,
                COLLECTIONS.CLIENTS,
                ID.unique(),
                {
                    name: newClient.name,
                    clientId: newClient.clientId, // Ensure schema map matches 'clientId'
                    password: newClient.password,
                    createdAt: new Date().toISOString()
                }
            );

            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Success',
                message: 'Client account created successfully'
            });

            setIsAddModalOpen(false);
            setNewClient({ name: '', clientId: '', password: '' });
            fetchClients();

        } catch (error: any) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to add client'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClient = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? They will no longer be able to log in.`)) return;

        try {
            await databases.deleteDocument(DB_ID, COLLECTIONS.CLIENTS, id);
            setNotification({
                isOpen: true,
                type: 'success',
                title: 'Deleted',
                message: 'Client removed successfully'
            });
            setClients(clients.filter(c => c.$id !== id));
        } catch (error) {
            setNotification({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to delete client'
            });
        }
    };

    // Filter Logic
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl text-white font-bold flex items-center gap-2">
                        <Users className="text-purple-500" />
                        Clients Master List
                    </h2>
                    <p className="text-gray-400 text-sm">Manage client accounts and login credentials.</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-gold-500 text-black hover:bg-gold-400 font-bold flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add New Client
                </Button>
            </div>

            {/* Search Bar */}
            <Card className="p-4 bg-dark-800/50">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <Input
                        placeholder="Search by company name or Client ID..."
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
                            <th className="p-4 font-medium border-b border-white/5">Client ID</th>
                            <th className="p-4 font-medium border-b border-white/5">Company Name</th>
                            <th className="p-4 font-medium border-b border-white/5">Password</th>
                            <th className="p-4 font-medium border-b border-white/5">Created Date</th>
                            <th className="p-4 font-medium border-b border-white/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-300 divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center">Loading clients...</td></tr>
                        ) : filteredClients.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No clients found.</td></tr>
                        ) : (
                            filteredClients.map((client) => (
                                <tr key={client.$id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-mono text-purple-400">{client.clientId}</td>
                                    <td className="p-4 font-medium text-white">{client.name}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">
                                        ••••••••
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(client.$createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteClient(client.$id, client.name)}
                                            className="text-gray-600 hover:text-red-500 transition-colors p-2"
                                            title="Delete Client"
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
                    <span>Showing {filteredClients.length} records</span>
                    <span>Total: {clients.length}</span>
                </div>
            </Card>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md p-6 border-gold-500/30">
                        <h3 className="text-xl font-bold text-white mb-4">Add New Client</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Company Name</label>
                                <Input
                                    placeholder="e.g. Acme Corp"
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Client ID (Unique Login)</label>
                                <Input
                                    placeholder="e.g. CL-001"
                                    value={newClient.clientId}
                                    onChange={(e) => setNewClient({ ...newClient, clientId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Password</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Secure Password"
                                        value={newClient.password}
                                        onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button
                                className="flex-1 bg-gold-500 text-black hover:bg-gold-400"
                                onClick={handleAddClient}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Client'}
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
