import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { SessionProvider, useSession } from './lib/SessionContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TrucksPage from './pages/TrucksPage';
import TruckDetailPage from './pages/TruckDetailPage';
import TrucksToSellPage from './pages/TrucksToSellPage';

function ProtectedRoute({ children, internalOnly = false }) {
  const { session, isInternal } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (internalOnly && !isInternal) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="trucks" element={<TrucksPage />} />
            <Route path="trucks/:id" element={<TruckDetailPage />} />
            <Route path="trucks-to-sell" element={<ProtectedRoute internalOnly><TrucksToSellPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
