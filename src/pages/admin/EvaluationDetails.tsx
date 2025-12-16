import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { databases, DB_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import {
    Download,
    Calendar,
    User,
    Shield,
    CheckCircle,
    AlertTriangle,
    FileWarning,
    UserMinus,
    Menu,
    X,
    LogOut,
    LayoutDashboard,
    BarChart3,
    Users,
    Building,
    Settings
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Evaluation {
    $id: string;
    guardId: string;
    totalScore: number;
    createdAt: string;
    kpi_scores: string; // JSON string
}

export default function AdminEvaluationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [guardName, setGuardName] = useState('');
    const [parsedScores, setParsedScores] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sidebar State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [adminName, setAdminName] = useState('Admin');

    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (!session) {
            navigate('/');
            return;
        }
        const adminData = JSON.parse(session);
        setAdminName(adminData.username || 'Admin');

        if (id) {
            fetchEvaluationDetails();
        }
    }, [id, navigate]);

    const fetchEvaluationDetails = async () => {
        try {
            const doc = await databases.getDocument(DB_ID, COLLECTIONS.EVALUATIONS, id!);
            setEvaluation(doc as any);

            // Parse scores
            if (doc.kpi_scores) {
                const scores = JSON.parse(doc.kpi_scores);
                setParsedScores(scores);
            }

            // Fetch Guard Name
            if (doc.guardId) {
                try {
                    const guardDoc = await databases.listDocuments(DB_ID, COLLECTIONS.GUARDS, [
                        Query.equal('guardId', doc.guardId)
                    ]);
                    if (guardDoc.documents.length > 0) {
                        setGuardName(guardDoc.documents[0].name);
                    } else {
                        setGuardName(doc.guardId);
                    }
                } catch (e) {
                    console.error("Could not fetch guard details", e);
                    setGuardName(doc.guardId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch evaluation:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRecommendation = (total: number) => {
        if (total >= 10) return { action: 'SEPARATION', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: UserMinus };
        if (total >= 7) return { action: 'FINAL WRITE-UP', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: FileWarning };
        if (total >= 3) return { action: 'WARNING', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle };
        return { action: 'GOOD STANDING', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle };
    };

    const downloadPDF = () => {
        if (!evaluation || !parsedScores) return;

        const doc = new jsPDF();

        // Brand Header
        doc.setFillColor(20, 20, 20); // Dark background
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Performance Evaluation Report', 105, 20, { align: 'center' });
        doc.setTextColor(234, 179, 8); // Gold color approximation
        doc.setFontSize(12);
        doc.text('Spade Security Services', 105, 30, { align: 'center' });

        // Guard Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Guard Name: ${guardName}`, 14, 55);
        doc.text(`Guard ID: ${evaluation.guardId}`, 14, 62);
        doc.text(`Date: ${new Date(evaluation.createdAt).toLocaleDateString()}`, 14, 69);

        // Score Summary
        const score = evaluation.totalScore;
        const rec = getRecommendation(score);

        doc.setFontSize(14);
        doc.text('Evaluation Summary', 140, 55);
        doc.setFontSize(12);
        doc.text(`Total Penalty Points: ${score}`, 140, 62);
        doc.setTextColor(rec.action === 'GOOD STANDING' ? 0 : 200, rec.action === 'GOOD STANDING' ? 128 : 0, 0);
        doc.text(`Action: ${rec.action}`, 140, 69);
        doc.setTextColor(0, 0, 0);

        // KPI Details Table
        const tableData = [
            ['Punctuality', parsedScores.punctuality || 0, parsedScores.remarks?.punctuality || '-'],
            ['Attendance', parsedScores.attendance || 0, parsedScores.remarks?.attendance || '-'],
            ['Patrol Completion', parsedScores.patrol || 0, parsedScores.remarks?.patrol || '-'],
            ['DAR Quality', parsedScores.dar || 0, parsedScores.remarks?.dar || '-'],
            ['Professional Conduct', parsedScores.conduct || 0, parsedScores.remarks?.conduct || '-'],
        ];

        autoTable(doc, {
            startY: 80,
            head: [['KPI Category', 'Points', 'Remarks']],
            body: tableData,
            headStyles: { fillColor: [20, 20, 20], textColor: [234, 179, 8] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        // Signatures
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.text('Evaluator Certification:', 14, finalY);
        doc.setFontSize(10);
        doc.text(`Name: ${parsedScores.evaluatorName || 'N/A'}`, 14, finalY + 10);
        doc.text(`Signature: ${parsedScores.evaluatorSignature || 'Signed Digitally'}`, 14, finalY + 17);
        doc.text(`Date Signed: ${new Date(evaluation.createdAt).toLocaleDateString()}`, 14, finalY + 24);

        doc.save(`Evaluation_Report_${guardName}_${new Date(evaluation.createdAt).toISOString().split('T')[0]}.pdf`);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        navigate('/');
    };

    const handleNavigate = (path: string) => {
        // Since we are in a sub-route /admin/evaluation/:id, 
        // we might simply want to navigate to the dashboard sections? 
        // But the dashboard is one page with tabs. 
        // So we navigate to /admin and let the dashboard default (or pass a state).
        // For now, simple navigation is fine.
        if (path === 'dashboard') navigate('/admin');
        else navigate('/admin'); // Default back to admin dashboard
    };

    if (isLoading) {
        return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-400">Loading details...</div>;
    }

    if (!evaluation) {
        return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-red-500">Evaluation not found.</div>;
    }

    const rec = getRecommendation(evaluation.totalScore);
    const RecIcon = rec.icon;

    return (
        <div className="min-h-screen bg-dark-900 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-dark-700">
                        <img
                            src="https://spadesecurityservices.com/wp-content/uploads/2025/06/SSS-Spade-Security-Brand-Logos-V1_3.-Landscape-logo-White-W-Strapline-1024x242.webp"
                            alt="Spade Logo"
                            className="w-full h-auto"
                        />
                    </div>

                    {/* User Info */}
                    <div className="p-4 border-b border-dark-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-gold-500" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{adminName}</p>
                                <p className="text-gold-500 text-xs">Administrator</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 p-4 space-y-2">
                        <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:bg-dark-700">
                            <LayoutDashboard className="w-5 h-5" /> Dashboard
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gold-500 bg-gold-500/20">
                            <BarChart3 className="w-5 h-5" /> Evaluation Report
                        </button>
                        <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:bg-dark-700">
                            <Users className="w-5 h-5" /> Guards
                        </button>
                        <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:bg-dark-700">
                            <Building className="w-5 h-5" /> Clients
                        </button>
                        <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:bg-dark-700">
                            <Settings className="w-5 h-5" /> Settings
                        </button>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-dark-700">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 lg:hidden text-gray-400"
                >
                    <X className="w-6 h-6" />
                </button>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden bg-dark-800 border-b border-dark-700 p-4 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6 text-gray-400" />
                    </button>
                    <h1 className="text-white font-bold">Evaluation Report</h1>
                    <div className="w-6" />
                </header>

                <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                    <div className="flex justify-end mb-6">
                        <Button
                            onClick={downloadPDF}
                            className="bg-gold-500 text-dark-900 font-bold hover:bg-gold-400 gap-2"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </Button>
                    </div>

                    {/* Main Report Card */}
                    <Card className="bg-dark-800 border-dark-700 overflow-hidden print:shadow-none">
                        {/* Report Header */}
                        <div className="p-8 border-b border-dark-700 bg-gradient-to-r from-dark-800 to-dark-900">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-white mb-2">Evaluation Report</h1>
                                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(evaluation.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-2"><User className="w-4 h-4" /> Evaluator: {parsedScores?.evaluatorName || 'Client'}</span>
                                    </div>
                                </div>
                                <div className={`px-6 py-4 rounded-xl border ${rec.bg} ${rec.border} flex flex-col items-center min-w-[150px]`}>
                                    <div className={`flex items-center gap-2 font-bold mb-1 ${rec.color}`}>
                                        {RecIcon && <RecIcon className="w-5 h-5" />}
                                        {rec.action}
                                    </div>
                                    <div className="text-3xl font-bold text-white">{evaluation.totalScore}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Penalty Points</div>
                                </div>
                            </div>
                        </div>

                        {/* Guard Info */}
                        <div className="p-8 border-b border-dark-700">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center">
                                    <Shield className="w-8 h-8 text-gold-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{guardName}</h2>
                                    <p className="text-gray-500 font-mono">ID: {evaluation.guardId}</p>
                                </div>
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="p-8">
                            <h3 className="text-lg font-bold text-white mb-6">Performance Breakdown</h3>
                            <div className="grid gap-4">
                                {[
                                    { label: 'Punctuality', key: 'punctuality' },
                                    { label: 'Attendance & Reliability', key: 'attendance' },
                                    { label: 'Patrol Completion', key: 'patrol' },
                                    { label: 'DAR Quality', key: 'dar' },
                                    { label: 'Professional Conduct', key: 'conduct' },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-start p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-300">{item.label}</p>
                                            {parsedScores?.remarks?.[item.key] && (
                                                <p className="text-sm text-gray-500 mt-1 italic">"{parsedScores.remarks[item.key]}"</p>
                                            )}
                                        </div>
                                        <div className="text-gold-500 font-bold font-mono text-lg ml-4">
                                            {parsedScores?.[item.key] || 0} pts
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer / Signature */}
                        <div className="p-8 bg-dark-900/30 border-t border-dark-700">
                            <div className="flex flex-col md:flex-row justify-between gap-8 text-sm">
                                <div>
                                    <p className="text-gray-500 mb-1">Evaluator Signature</p>
                                    <p className="text-white font-mono">{parsedScores?.evaluatorSignature || 'Signed Digitally'}</p>
                                </div>
                                <div className="md:text-right">
                                    <p className="text-gray-500 mb-1">Report Generated</p>
                                    <p className="text-white">{new Date().toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
