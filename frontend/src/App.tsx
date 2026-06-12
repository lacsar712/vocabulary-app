import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VocabularyTest from './pages/VocabularyTest';
import WordBrowse from './pages/WordBrowse';
import SpellingChallenge from './pages/SpellingChallenge';
import Leaderboard from './pages/Leaderboard';
import ThemeLearning from './pages/ThemeLearning';
import NotificationCenter from './pages/NotificationCenter';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-page text-text-primary font-sans aurora-bg">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationCenter />
                </ProtectedRoute>
              } />
              <Route path="/test" element={
                <ProtectedRoute>
                  <VocabularyTest />
                </ProtectedRoute>
              } />
              <Route path="/browse" element={
                <ProtectedRoute>
                  <WordBrowse />
                </ProtectedRoute>
              } />
              <Route path="/spelling-challenge" element={
                <ProtectedRoute>
                  <SpellingChallenge />
                </ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              } />
              <Route path="/themes" element={
                <ProtectedRoute>
                  <ThemeLearning />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
