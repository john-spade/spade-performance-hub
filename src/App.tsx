import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import GuardProfile from '@/pages/admin/GuardProfile';
import ClientProfile from '@/pages/admin/ClientProfile';
import AdminEvaluationDetails from '@/pages/admin/EvaluationDetails';
import ClientDashboard from '@/pages/client/Dashboard';
import EvaluationDetails from '@/pages/client/EvaluationDetails';
import NotFound from '@/pages/NotFound';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/guard/:id" element={<GuardProfile />} />
                <Route path="/admin/client/:id" element={<ClientProfile />} />
                <Route path="/admin/evaluation/:id" element={<AdminEvaluationDetails />} />
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/evaluation/:id" element={<EvaluationDetails />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;
