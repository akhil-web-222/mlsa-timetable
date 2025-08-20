import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { validateEmail } from '../utils/constants';

const MemberDetails = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    reg_number: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage('Name is required');
      setMessageType('error');
      return false;
    }
    
    if (!formData.reg_number.trim()) {
      setMessage('Registration number is required');
      setMessageType('error');
      return false;
    }
    
    if (!formData.email.trim()) {
      setMessage('Email is required');
      setMessageType('error');
      return false;
    }
    
    if (!validateEmail(formData.email)) {
      setMessage('Please enter a valid SRM email address (@srmist.edu.in)');
      setMessageType('error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Check if member already exists
      const response = await api.get(`/members/status/${formData.reg_number.trim()}`);
      
      // If member exists, go to status page
      setMessage('Existing member found! Redirecting to status page...');
      setMessageType('success');
      setTimeout(() => {
        navigate(`/status?reg=${encodeURIComponent(formData.reg_number.trim())}`);
      }, 1500);
      
    } catch (error) {
      if (error.response?.status === 404) {
        // Member doesn't exist, go to submission page with pre-filled data
        setMessage('New member! Redirecting to timetable submission...');
        setMessageType('success');
        setTimeout(() => {
          const params = new URLSearchParams({
            name: formData.name,
            reg: formData.reg_number,
            email: formData.email
          });
          navigate(`/submit?${params.toString()}`);
        }, 1500);
      } else {
        setMessage('Error checking member status. Please try again.');
        setMessageType('error');
      }
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
            <Link to="/admin/login">Admin</Link>
          </nav>
        </div>
      </div>

      <div className="card">
        <h2>Enter Your Details</h2>
        <p>Please provide your basic information to continue.</p>
        
        {message && (
          <div className={`alert alert-${messageType === 'error' ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg_number">Registration Number *</label>
            <input
              type="text"
              id="reg_number"
              name="reg_number"
              value={formData.reg_number}
              onChange={handleInputChange}
              placeholder="e.g., RA2111003010XXX"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">SRM Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="yourname@srmist.edu.in"
              required
              disabled={loading}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              type="submit" 
              className="btn"
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>

        {/* <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>What happens next?</h4>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li><strong>If you're a new member:</strong> You'll be taken to submit your free slots</li>
            <li><strong>If you already submitted:</strong> You'll see your current status and can update if needed</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
};

export default MemberDetails;
