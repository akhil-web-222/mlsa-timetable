import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { SLOT_LABELS, DAY_LABELS, validateEmail } from '../utils/constants';

const MemberSubmission = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    reg_number: '',
    email: '',
    free_slots: [],
    publicity_duty_preferences: {},
    publicity_slots: []
  });
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isUpdate, setIsUpdate] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState({});
  const [publicityValidationErrors, setPublicityValidationErrors] = useState({});

  // Auto-load data when coming from status page with reg parameter or initial details
  useEffect(() => {
    const regParam = searchParams.get('reg');
    const nameParam = searchParams.get('name');
    const emailParam = searchParams.get('email');
    
    if (regParam) {
      setFormData(prev => ({ 
        ...prev, 
        reg_number: regParam,
        name: nameParam || prev.name,
        email: emailParam || prev.email
      }));
      
      // If coming from status page (has reg but no name/email), load existing data
      if (!nameParam && !emailParam) {
        loadMemberData(regParam);
      } else {
        // Coming from initial form with new member details
        setMessage('Please select your free slots below.');
        setMessageType('info');
      }
    }
    
    // Load slot availability on component mount
    loadSlotAvailability();
  }, [searchParams]);

  // Load slot availability
  const loadSlotAvailability = async () => {
    try {
      const response = await api.get('/publicity/availability');
      setSlotAvailability(response.data);
    } catch (error) {
      console.error('Error loading slot availability:', error);
    }
  };

  // Function to load member data
  const loadMemberData = async (regNumber) => {
    if (!regNumber?.trim()) return;
    
    setLoadingExisting(true);
    setMessage('');
    
    try {
      console.log('Attempting to load data for:', regNumber);
      const response = await api.get(`/members/status/${regNumber}`);
      const memberData = response.data;
      
      console.log('Loaded member data:', memberData);
      
      // Pre-populate form with existing data
      setFormData(prev => ({
        ...prev,
        name: memberData.name,
        email: memberData.email,
        free_slots: memberData.free_slots || [],
        publicity_duty_preferences: memberData.publicity_duty_preferences || {},
        publicity_slots: memberData.publicity_slots || []
      }));
      
      setIsUpdate(true);
      setMessage(`Loaded existing data for ${memberData.name}. You can now update your slots.`);
      setMessageType('success');
      
    } catch (error) {
      console.error('Error loading member data:', error);
      if (error.response?.status === 404) {
        setMessage('New submission - please fill in your details.');
        setMessageType('info');
        setIsUpdate(false);
      } else {
        setMessage('Error loading existing data. Please try again.');
        setMessageType('error');
      }
    } finally {
      setLoadingExisting(false);
    }
  };

  // Load existing data when registration number is entered and focus is lost
  const handleRegNumberBlur = async () => {
    const regNumber = formData.reg_number.trim();
    if (regNumber && regNumber.length > 0) {
      await loadMemberData(regNumber);
    }
  };

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
      
      // Update publicity slots - get duty type preference (default to C2C if not set)
      const dayPreference = prev.publicity_duty_preferences[day] || 'C2C';
      let newPublicitySlots = prev.publicity_slots;
      
      if (checked) {
        // Add publicity slot
        newPublicitySlots = [...prev.publicity_slots, { day, slot, duty_type: dayPreference }];
      } else {
        // Remove publicity slot
        newPublicitySlots = prev.publicity_slots.filter(s => !(s.day === day && s.slot === slot));
      }
      
      return {
        ...prev,
        free_slots: newSlots,
        publicity_slots: newPublicitySlots
      };
    });
  };

  const handlePublicityPreferenceChange = (day, preference) => {
    setFormData(prev => ({
      ...prev,
      publicity_duty_preferences: {
        ...prev.publicity_duty_preferences,
        [day]: preference
      }
    }));
    
    // Update publicity slots based on preference and selected free slots
    updatePublicitySlots(day, preference);
  };

  const updatePublicitySlots = (day, preference) => {
    setFormData(prev => {
      // Get free slots for this day
      const dayFreeSlots = prev.free_slots.filter(slot => slot.day === day);
      
      // Create publicity slots for this day with the selected duty type
      const newPublicitySlots = dayFreeSlots.map(slot => ({
        day: slot.day,
        slot: slot.slot,
        duty_type: preference
      }));

      return {
        ...prev,
        publicity_slots: [
          ...prev.publicity_slots.filter(slot => slot.day !== day),
          ...newPublicitySlots
        ]
      };
    });
  };

  const validatePublicityDuty = () => {
    const errors = {};
    
    // Check each day order for minimum 2 slots
    for (let day = 1; day <= 5; day++) {
      const dayPublicitySlots = formData.publicity_slots.filter(slot => slot.day === day);
      if (dayPublicitySlots.length > 0 && dayPublicitySlots.length < 2) {
        const dutyType = formData.publicity_duty_preferences[day] || 'C2C';
        errors[day] = `Min 2 slots required for ${dutyType}`;
      }
    }
    
    setPublicityValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getSlotAvailabilityInfo = (day, slot, dutyType) => {
    if (!slotAvailability[day] || !slotAvailability[day][slot] || !slotAvailability[day][slot][dutyType]) {
      return { capacity: 5, used: 0, available: 5 };
    }
    return slotAvailability[day][slot][dutyType];
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

    // Validate publicity duty requirements
    if (!validatePublicityDuty()) {
      setMessage('Please fix publicity duty validation errors shown below');
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
      
      // Navigate to thank you page with member details
      navigate('/thank-you', {
        state: {
          isUpdate: isUpdate,
          memberName: formData.name
        }
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to submit timetable';
      setMessage(errorMessage);
      setMessageType('error');
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
            {/* <Link to="/admin/login">Admin</Link> */}
          </nav>
        </div>
      </div>

      <div className="card">
        <h2>{isUpdate ? 'Update Your Free Slots' : 'Submit Your Free Slots'}</h2>
        <p>
          {isUpdate 
            ? 'You can modify your existing selections below and submit the changes.'
            : 'Please fill in your details and select all the time slots when you are available.'
          }
        </p>
        
        {isUpdate && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#d1ecf1', 
            border: '1px solid #bee5eb', 
            borderRadius: '4px',
            marginBottom: '16px',
            color: '#0c5460'
          }}>
            <strong>ℹ️ Update Mode:</strong> Your existing data has been loaded. Modify as needed and click "Update Timetable".
          </div>
        )}
        
        {message && (
          <div className={`alert alert-${messageType === 'error' ? 'error' : messageType === 'info' ? 'warning' : 'success'}`}>
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
                onBlur={handleRegNumberBlur}
                placeholder="e.g., RA2111003010XXX"
                required
                disabled={loadingExisting}
              />
              {loadingExisting && (
                <small style={{ color: '#007bff' }}>Loading existing data...</small>
              )}
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
                  
                  {/* Publicity Duty Preference for this day */}
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                      Publicity Duty:
                    </label>
                    <select
                      value={formData.publicity_duty_preferences[dayIndex + 1] || 'C2C'}
                      onChange={(e) => handlePublicityPreferenceChange(dayIndex + 1, e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px', 
                        fontSize: '12px',
                        border: publicityValidationErrors[dayIndex + 1] ? '2px solid #dc3545' : '1px solid #ddd',
                        borderRadius: '3px',
                        backgroundColor: publicityValidationErrors[dayIndex + 1] ? '#fff5f5' : 'white'
                      }}
                    >
                      <option value="C2C">C2C</option>
                      <option value="HELPDESK">Helpdesk</option>
                    </select>
                    {publicityValidationErrors[dayIndex + 1] && (
                      <div style={{ color: '#dc3545', fontSize: '10px', marginTop: '2px' }}>
                        {publicityValidationErrors[dayIndex + 1]}
                      </div>
                    )}
                    
                    {/* Show availability info for selected duty type */}
                    {formData.publicity_duty_preferences[dayIndex + 1] && (
                      <div style={{ fontSize: '10px', marginTop: '4px', color: '#666' }}>
                        {formData.publicity_duty_preferences[dayIndex + 1]} slots: Min 2 required
                      </div>
                    )}
                  </div>

                  {SLOT_LABELS.map((slotLabel, slotIndex) => {
                    const isSelected = isSlotSelected(dayIndex + 1, slotIndex + 1);
                    const dutyType = formData.publicity_duty_preferences[dayIndex + 1] || 'C2C';
                    const availability = getSlotAvailabilityInfo(dayIndex + 1, slotIndex + 1, dutyType);
                    const isSlotFull = availability.available <= 0 && !isSelected;
                    
                    return (
                      <div 
                        key={slotIndex} 
                        className={`slot-checkbox ${isSelected ? 'selected' : ''} ${isSlotFull ? 'disabled' : ''}`}
                        onClick={() => {
                          if (!isSlotFull) {
                            handleSlotChange(dayIndex + 1, slotIndex + 1, !isSelected);
                          }
                        }}
                        style={{
                          opacity: isSlotFull ? 0.5 : 1,
                          cursor: isSlotFull ? 'not-allowed' : 'pointer',
                          backgroundColor: isSlotFull ? '#f8f9fa' : (isSelected ? '#d4edda' : 'white')
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`slot-${dayIndex + 1}-${slotIndex + 1}`}
                          checked={isSelected}
                          disabled={isSlotFull}
                          onChange={() => {}} // Handled by div onClick
                          onClick={(e) => e.stopPropagation()} // Prevent double toggle
                        />
                        <label htmlFor={`slot-${dayIndex + 1}-${slotIndex + 1}`} style={{ cursor: isSlotFull ? 'not-allowed' : 'pointer' }}>
                          Slot {slotIndex + 1}<br/>
                          <small>{slotLabel}</small>
                          {isSelected && <span style={{ color: '#28a745', fontSize: '12px' }}> ✓</span>}
                          {isSlotFull && <span style={{ color: '#dc3545', fontSize: '12px' }}> FULL</span>}
                          
                          {/* Show availability for this slot */}
                          <div style={{ 
                            fontSize: '10px', 
                            color: isSlotFull ? '#dc3545' : (availability.available < 3 ? '#ff8c00' : '#28a745'),
                            fontWeight: 'bold'
                          }}>
                            {dutyType}: {availability.used}/{availability.capacity}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              type="submit" 
              className="btn"
              disabled={loading || loadingExisting}
            >
              {loading 
                ? (isUpdate ? 'Updating...' : 'Submitting...') 
                : (isUpdate ? 'Update Timetable' : 'Submit Timetable')
              }
            </button>
            
            {isUpdate && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setFormData({
                    name: '',
                    reg_number: '',
                    email: '',
                    free_slots: [],
                    publicity_duty_preferences: {},
                    publicity_slots: []
                  });
                  setIsUpdate(false);
                  setMessage('');
                  setPublicityValidationErrors({});
                }}
                style={{ marginLeft: '12px' }}
              >
                Reset Form
              </button>
            )}
          </div>
        </form>

        {/* <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Important Notes:</h4>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>You can resubmit your timetable multiple times before it gets locked</li>
            <li>Only use your official SRM email address</li>
            <li>Select all slots where you are completely free</li>
            <li>Once submitted, contact admin if you need to make changes</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
};

export default MemberSubmission;
