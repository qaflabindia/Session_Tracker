import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSemester from './pages/NewSemester';
import SemesterDetail from './pages/SemesterDetail';
import SemesterSetup from './pages/SemesterSetup';
import Analytics from './pages/Analytics';
import AITimetableUpload from './pages/AITimetableUpload';
import { LogOut } from 'lucide-react';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      {user && (
        <nav className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Session Tracker
                </h1>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="btn-secondary flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/semester/new"
          element={
            <PrivateRoute>
              <NewSemester />
            </PrivateRoute>
          }
        />
        <Route
          path="/semester/:id"
          element={
            <PrivateRoute>
              <SemesterDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/semester/:id/setup"
          element={
            <PrivateRoute>
              <SemesterSetup />
            </PrivateRoute>
          }
        />
        <Route
          path="/semester/:id/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/semester/:id/ai-import"
          element={
            <PrivateRoute>
              <AITimetableUpload />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
