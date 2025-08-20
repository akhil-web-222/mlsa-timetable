import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MemberSubmission from './pages/MemberSubmission';
import MemberStatus from './pages/MemberStatus';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import useAuthStore from './store/authStore';
import './App.css';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MemberSubmission />} />
          <Route path="/status" element={<MemberStatus />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected admin routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              isAuthenticated ? <AdminDashboard /> : <Navigate to="/admin/login" />
            } 
          />
          
          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
