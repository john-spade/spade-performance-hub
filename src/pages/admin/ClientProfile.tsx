import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { ArrowLeft, Building, Calendar, FileText, CheckCircle } from 'lucide-react';

interface Client {
    id: string;
    name: string;
    clientId: string;
    type?: string;
    status?: string;
}

interface Evaluation {
    id: string;
    totalScore: number;
    createdAt: string;
    guardName?: string; // We'll need to fetch this or store it
    guardId: string;
}

export default function ClientProfile() {
    const navigate = useNavigate();
    const params = useParams();
    const clientId = params.id as string; // This is the 'clientId' field (e.g. TC-001), not the doc ID, typically.
    // Wait, AdminDashboard navigates using valid Appwrite document attributes? 
    // In Dashboard.tsx we usually navigate with `clientId` (the business ID), so we query by that.

    const [client, setClient] = useState<Client | null>(null);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                // Fetch basic client info
                // We assume the URL param is the 'clientId' (e.g., 'SS-001-A'), so we query by that.
                const clientRes = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, [
                    Query.equal('clientId', clientId)
                ]);

                if (clientRes.documents.length === 0) {
                    console.error('Client not found');
                    setIsLoading(false);
                    return;
                }

                const clientDoc = clientRes.documents[0];
                setClient({
                    id: clientDoc.$id,
                    name: clientDoc.name,
                    clientId: clientDoc.clientId,
                    type: clientDoc.type || 'Corporate', // Default to Corporate if missing
                    status: 'Active' // Hardcoded for now unless in schema
                });

                // Fetch evaluations submitted by this client
                const evalsRes = await databases.listDocuments(DB_ID, COLLECTIONS.EVALUATIONS, [
                    Query.equal('clientId', clientId),
                    Query.orderDesc('createdAt')
                ]);

                // We need Guard Names for these evaluations. They have guardId.
                // Let's fetch all guards or just map them if we can. 
                // Fetching all guards is easiest for now (assuming < 100 guards). 
                // Optimally we'd fetch specific ones but let's do a bulk fetch for mapping.
                const guardsRes = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS);
                const guardMap: Record<string, string> = {};
                guardsRes.documents.forEach((g: any) => {
                    guardMap[g.guardId] = g.name;
                });

                const evalsList = evalsRes.documents.map((doc: any) => ({
                    id: doc.$id,
                    totalScore: doc.totalScore,
                    createdAt: doc.createdAt,
                    guardId: doc.guardId,
                    guardName: guardMap[doc.guardId] || doc.guardId
                }));

                setEvaluations(evalsList);

            } catch (error) {
                console.error('Failed to fetch client details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (clientId) {
            fetchClientData();
        }
    }, [clientId]);

    if (isLoading) {
        return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-400">Loading Profile...</div>;
    }

    if (!client) {
        return (
            <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-400">Client not found.</p>
                <Button onClick={() => navigate(-1)} className="bg-dark-800 text-white hover:bg-dark-700">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-dark-800 rounded-full hover:bg-dark-700 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Client Profile</h1>
                        <p className="text-gray-500 text-sm">Site details and activity</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-dark-800/50 border-gold-500/20 md:col-span-2">
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-dark-900 rounded-2xl flex items-center justify-center border border-dark-700">
                                <Building className="w-10 h-10 text-gold-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{client.name}</h2>
                                        <p className="text-gold-500 font-mono mt-1">{client.clientId}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded text-xs font-bold uppercase tracking-wider border border-green-500/20 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        {client.status}
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                                        <p className="text-xs text-gray-500 mb-1">Type</p>
                                        <p className="text-white font-medium">{client.type}</p>
                                    </div>
                                    <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                                        <p className="text-xs text-gray-500 mb-1">Joined</p>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-600" /> 2024
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="p-6 bg-dark-800/50 border-dark-700 space-y-6">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Evaluations Submitted</p>
                            <span className="text-4xl font-bold text-white">{evaluations.length}</span>
                        </div>
                        <div className="h-px bg-dark-700" />
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Last Activity</p>
                            <span className="text-white font-medium">
                                {evaluations.length > 0
                                    ? new Date(evaluations[0].createdAt).toLocaleDateString()
                                    : 'No activity'}
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Evaluation History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gold-500" />
                        Recent Evaluations
                    </h3>

                    {evaluations.length === 0 ? (
                        <Card className="p-8 bg-dark-800/30 border-dark-700 text-center">
                            <p className="text-gray-500">No evaluations submitted by this client yet.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {evaluations.map((evalItem) => (
                                <Card key={evalItem.id} className="p-5 bg-dark-800/50 border-dark-700 hover:border-gold-500/30 transition-all group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-dark-900 flex items-center justify-center font-bold text-lg text-gray-300 border border-dark-700">
                                                {evalItem.totalScore}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">Evaluated {evalItem.guardName}</p>
                                                <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                    {new Date(evalItem.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
