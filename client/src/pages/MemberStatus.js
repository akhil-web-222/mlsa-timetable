import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { SLOT_LABELS, DAY_LABELS, formatDate } from '../utils/constants';

const MemberStatus = () => {
  const [searchParams] = useSearchParams();
  const [regNumber, setRegNumber] = useState('');
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-search if reg parameter is provided
  useEffect(() => {
    const regParam = searchParams.get('reg');
    if (regParam) {
      setRegNumber(regParam);
      handleSearch(null, regParam);
    }
  }, [searchParams]);

  const handleSearch = async (e, regParam = null) => {
    if (e) e.preventDefault();
    
    const searchRegNumber = regParam || regNumber.trim();
    if (!searchRegNumber) {
      setError('Please enter a registration number');
      return;
    }
    
    setLoading(true);
    setError('');
    setMember(null);
    
    try {
      const response = await api.get(`/members/status/${searchRegNumber}`);
      setMember(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderTimetable = () => {
    if (!member || !member.free_slots) return null;
    
    return (
      <div className="timetable-grid">
        {DAY_LABELS.map((dayLabel, dayIndex) => (
          <div key={dayIndex} className="day-column">
            <div className="day-title">{dayLabel}</div>
            {SLOT_LABELS.map((slotLabel, slotIndex) => {
              const isSelected = member.free_slots.some(
                slot => slot.day === dayIndex + 1 && slot.slot === slotIndex + 1
              );
              
              return (
                <div 
                  key={slotIndex} 
                  className={`slot-checkbox ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? '#d4edda' : '#f8f9fa',
                    border: isSelected ? '2px solid #28a745' : '1px solid #dee2e6'
                  }}
                >
                  <span style={{ fontWeight: isSelected ? '600' : 'normal' }}>
                    Slot {slotIndex + 1}<br/>
                    <small>{slotLabel}</small>
                    {isSelected && <span style={{ color: '#28a745', marginLeft: '8px' }}>✓</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="navbar">
        <div className="container">
          <h1 className="navbar-brand">MLSA Timetable System</h1>
          <nav className="navbar-nav">
            <Link to="/">Submit Timetable</Link>
            <Link to="/admin/login">Admin</Link>
          </nav>
        </div>
      </div>

      <div className="card">
        <h2>Check Submission Status</h2>
        <p>Enter your registration number to view your submitted timetable and status.</p>
        
        <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label htmlFor="regNumber">Registration Number</label>
            <input
              type="text"
              id="regNumber"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g., RA2111003010XXX"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Check Status'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {member && (
          <div>
            <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
              <h3>Submission Details</h3>
              <div className="grid grid-2">
                <div>
                  <strong>Name:</strong> {member.name}
                </div>
                <div>
                  <strong>Registration Number:</strong> {member.reg_number}
                </div>
                <div>
                  <strong>Email:</strong> {member.email}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span className={`badge ${member.locked ? 'badge-danger' : 'badge-success'}`}>
                    {member.locked ? 'Locked' : 'Open'}
                  </span>
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(member.last_updated)}
                </div>
                <div>
                  <strong>Total Changes:</strong> {member.changes_count}
                </div>
                <div>
                  <strong>Free Slots Selected:</strong> {member.free_slots.length}
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Your Free Slots</h3>
              {member.free_slots.length > 0 ? (
                <>
                  <p>Green slots indicate when you are available:</p>
                  {renderTimetable()}
                </>
              ) : (
                <div className="alert alert-warning">
                  No free slots submitted yet.
                </div>
              )}
            </div>

            {member.locked && (
              <div className="alert alert-warning">
                <strong>Submission Locked:</strong> Your timetable has been locked by the admin. 
                Contact the admin if you need to make changes.
              </div>
            )}

            {!member.locked && (
              <div className="alert alert-success">
                <strong>Submission Open:</strong> You can still make changes to your timetable. 
                <Link 
                  to={`/?reg=${encodeURIComponent(member.reg_number)}`} 
                  style={{ marginLeft: '8px' }}
                >
                  Update Timetable
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberStatus;
