import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { SLOT_LABELS, DAY_LABELS, validateEmail } from '../utils/constants';

const MemberSubmission = () => {
  const [formData, setFormData] = useState({
    name: '',
    reg_number: '',
    email: '',
    free_slots: []
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

  const handleSlotChange = (day, slot, checked) => {
    setFormData(prev => {
      const newSlots = checked
        ? [...prev.free_slots, { day, slot }]
        : prev.free_slots.filter(s => !(s.day === day && s.slot === slot));
      
      return {
        ...prev,
        free_slots: newSlots
      };
    });
  };

  const isSlotSelected = (day, slot) => {
    return formData.free_slots.some(s => s.day === day && s.slot === slot);
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
    
    if (formData.free_slots.length === 0) {
      setMessage('Please select at least one free slot');
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
      const response = await api.post('/members/submit', formData);
      setMessage('Timetable submitted successfully!');
      setMessageType('success');
      
      // Reset form
      setFormData({
        name: '',
        reg_number: '',
        email: '',
        free_slots: []
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to submit timetable';
      setMessage(errorMessage);
      setMessageType('error');
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
            <Link to="/status">Check Status</Link>
            <Link to="/admin/login">Admin</Link>
          </nav>
        </div>
      </div>

      <div className="card">
        <h2>Submit Your Free Slots</h2>
        <p>Please fill in your details and select all the time slots when you are available.</p>
        
        {message && (
          <div className={`alert alert-${messageType === 'error' ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
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
              />
            </div>
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
            />
          </div>

          <div className="form-group">
            <label>Select Your Free Slots *</label>
            <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              Check all the time slots when you are available (no classes/commitments)
            </p>
            
            <div className="timetable-grid">
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <div key={dayIndex} className="day-column">
                  <div className="day-title">{dayLabel}</div>
                  {SLOT_LABELS.map((slotLabel, slotIndex) => (
                    <div key={slotIndex} className="slot-checkbox">
                      <input
                        type="checkbox"
                        id={`slot-${dayIndex + 1}-${slotIndex + 1}`}
                        checked={isSlotSelected(dayIndex + 1, slotIndex + 1)}
                        onChange={(e) => handleSlotChange(
                          dayIndex + 1, 
                          slotIndex + 1, 
                          e.target.checked
                        )}
                      />
                      <label htmlFor={`slot-${dayIndex + 1}-${slotIndex + 1}`}>
                        Slot {slotIndex + 1}<br/>
                        <small>{slotLabel}</small>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              type="submit" 
              className="btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Timetable'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Important Notes:</h4>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>You can resubmit your timetable multiple times before it gets locked</li>
            <li>Only use your official SRM email address</li>
            <li>Select all slots where you are completely free</li>
            <li>Once submitted, contact admin if you need to make changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MemberSubmission;
