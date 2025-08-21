import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { SLOT_LABELS, DAY_LABELS, formatDate } from '../utils/constants';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    day: '',
    slot: '',
    locked: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 20
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const navigate = useNavigate();
  const { admin, logout } = useAuthStore();

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'members') {
      fetchMembers();
    }
  }, [activeTab, filters, pagination.current_page]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.current_page,
        limit: pagination.per_page
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await api.get('/admin/members', { params });
      setMembers(response.data.members);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      showMessage('Failed to fetch members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/admin/logout');
      logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUnlockMember = async (memberId) => {
    try {
      await api.patch(`/admin/members/${memberId}/unlock`);
      showMessage('Member unlocked successfully', 'success');
      fetchMembers();
    } catch (error) {
      console.error('Unlock error:', error);
      showMessage('Failed to unlock member', 'error');
    }
  };

  const handleResetMember = async (memberId, memberName) => {
    if (window.confirm(`Are you sure you want to reset all data for ${memberName}? This will clear all their selected time slots and unlock their submission.`)) {
      try {
        await api.patch(`/admin/members/${memberId}/reset`);
        showMessage('Member data reset successfully', 'success');
        fetchMembers();
      } catch (error) {
        console.error('Reset error:', error);
        showMessage('Failed to reset member data', 'error');
      }
    }
  };

  const handleExport = async (format, scope = 'all', day = null) => {
    try {
      const params = { scope };
      if (scope === 'day' && day) params.day = day;
      
      const url = `/admin/export/${format}`;
      const response = await api.get(url, { 
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = scope === 'all' 
        ? `timetable_export_${timestamp}.${format}`
        : `timetable_day${day}_${timestamp}.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showMessage(`${format.toUpperCase()} exported successfully`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Export failed', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const renderOverview = () => (
    <div>
      <h3>System Overview</h3>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="grid grid-3">
          <div className="card">
            <h4>Total Submissions</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
              {stats.total_members || 0}
            </div>
          </div>
          
          <div className="card">
            <h4>Locked Submissions</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
              {stats.locked_members || 0}
            </div>
          </div>
          
          <div className="card">
            <h4>Open Submissions</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {stats.unlocked_members || 0}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h4>Export Data</h4>
        <div className="grid grid-2">
          <div>
            <h5>Complete Export</h5>
            <button 
              className="btn btn-small"
              onClick={() => handleExport('csv')}
            >
              Download CSV
            </button>
          </div>
          
          <div>
            <h5>Day-wise Export</h5>
            {DAY_LABELS.map((label, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <span style={{ marginRight: '8px' }}>{label}:</span>
                <button 
                  className="btn btn-small"
                  onClick={() => handleExport('csv', 'day', index + 1)}
                >
                  CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.slot_availability && (
        <div className="card">
          <h4>Slot Availability Overview</h4>
          <div className="timetable-grid">
            {DAY_LABELS.map((dayLabel, dayIndex) => (
              <div key={dayIndex} className="day-column">
                <div className="day-title">{dayLabel}</div>
                {SLOT_LABELS.map((slotLabel, slotIndex) => {
                  const count = stats.slot_availability[`day${dayIndex + 1}`]?.[`slot${slotIndex + 1}`] || 0;
                  return (
                    <div key={slotIndex} className="slot-checkbox" style={{
                      backgroundColor: count > 0 ? '#d4edda' : '#f8f9fa',
                      border: `1px solid ${count > 0 ? '#28a745' : '#dee2e6'}`
                    }}>
                      <span>
                        Slot {slotIndex + 1}<br/>
                        <small>{slotLabel}</small><br/>
                        <strong>{count} members</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderMembers = () => (
    <div>
      <h3>Manage Members</h3>
      
      {/* Filters */}
      <div className="card">
        <h4>Filters</h4>
        <div className="grid grid-2">
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Name, registration, or email"
            />
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <select
              value={filters.locked}
              onChange={(e) => setFilters({...filters, locked: e.target.value})}
            >
              <option value="">All</option>
              <option value="true">Locked</option>
              <option value="false">Unlocked</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Day</label>
            <select
              value={filters.day}
              onChange={(e) => setFilters({...filters, day: e.target.value})}
            >
              <option value="">All Days</option>
              {DAY_LABELS.map((label, index) => (
                <option key={index} value={index + 1}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Slot</label>
            <select
              value={filters.slot}
              onChange={(e) => setFilters({...filters, slot: e.target.value})}
            >
              <option value="">All Slots</option>
              {SLOT_LABELS.map((label, index) => (
                <option key={index} value={index + 1}>Slot {index + 1} ({label})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Registration</th>
                  <th>Email</th>
                  <th>Free Slots</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member._id}>
                    <td>{member.name}</td>
                    <td>{member.reg_number}</td>
                    <td>{member.email}</td>
                    <td>{member.free_slots.length}</td>
                    <td>
                      <span className={`badge ${member.locked ? 'badge-danger' : 'badge-success'}`}>
                        {member.locked ? 'Locked' : 'Open'}
                      </span>
                    </td>
                    <td>{formatDate(member.last_updated)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {member.locked && (
                          <button
                            className="btn btn-small btn-warning"
                            onClick={() => handleUnlockMember(member._id)}
                          >
                            Unlock
                          </button>
                        )}
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleResetMember(member._id, member.name)}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="pagination">
                <button
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPagination({...pagination, current_page: pagination.current_page - 1})}
                >
                  Previous
                </button>
                
                <span>
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                
                <button
                  disabled={pagination.current_page >= pagination.total_pages}
                  onClick={() => setPagination({...pagination, current_page: pagination.current_page + 1})}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="navbar">
        <div className="container">
          <h1 className="navbar-brand">Admin Dashboard</h1>
          <nav className="navbar-nav">
            <span>Welcome, {admin?.username}</span>
            <button className="btn btn-small" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType === 'error' ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'overview' ? '' : 'btn-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`btn ${activeTab === 'members' ? '' : 'btn-secondary'}`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'members' && renderMembers()}
      </div>
    </div>
  );
};

export default AdminDashboard;
