import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/admin/login', credentials);
      login(response.data.admin);
      navigate('/admin/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="navbar">
        <div className="container">
          <h1 className="navbar-brand">MLSA Timetable System</h1>
          <nav className="navbar-nav">
            <Link to="/">Submit Timetable</Link>
            <Link to="/status">Check Status</Link>
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center' }}>Admin Login</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>
            Access the admin dashboard to manage submissions
          </p>
          
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Enter admin username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Enter admin password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Default Credentials:</h4>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <strong>Username:</strong> admin<br/>
              <strong>Password:</strong> StrongPass
            </p>
            <small style={{ color: '#666' }}>
              Please change the default password after first login
            </small>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
