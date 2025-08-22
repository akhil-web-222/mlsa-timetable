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
  const [publicityCapacities, setPublicityCapacities] = useState([]);
  const [publicityStats, setPublicityStats] = useState({});
  const [bulkCapacityC2C, setBulkCapacityC2C] = useState(5);
  const [bulkCapacityHelpdesk, setBulkCapacityHelpdesk] = useState(5);

  const navigate = useNavigate();
  const { admin, logout } = useAuthStore();

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'publicity') {
      fetchPublicityData();
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

  const fetchPublicityData = async () => {
    try {
      setLoading(true);
      const [capacitiesResponse, statsResponse] = await Promise.all([
        api.get('/publicity/admin/capacity'),
        api.get('/publicity/admin/stats')
      ]);
      setPublicityCapacities(capacitiesResponse.data);
      setPublicityStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to fetch publicity data:', error);
      showMessage('Failed to fetch publicity data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateCapacity = async (day, slot, dutyType, newCapacity) => {
    try {
      await api.put('/publicity/admin/capacity', {
        day,
        slot,
        duty_type: dutyType,
        capacity: newCapacity
      });
      showMessage('Capacity updated successfully', 'success');
      fetchPublicityData(); // Refresh data
    } catch (error) {
      console.error('Failed to update capacity:', error);
      showMessage('Failed to update capacity', 'error');
    }
  };

  const updateAllCapacities = async (dutyType, newCapacity) => {
    if (!newCapacity || newCapacity < 1 || newCapacity > 50) {
      showMessage('Capacity must be between 1 and 50', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Use the new bulk update endpoint
      const response = await api.put('/publicity/admin/capacity/bulk', {
        duty_type: dutyType,
        capacity: newCapacity
      });
      
      showMessage(response.data.message, 'success');
      fetchPublicityData(); // Refresh data
    } catch (error) {
      console.error('Failed to update all capacities:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update all capacities';
      showMessage(errorMessage, 'error');
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

  const handleDeleteMember = async (memberId, memberName, regNumber) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE ${memberName} (${regNumber})? This action cannot be undone and will remove all their data from the system.`)) {
      try {
        await api.delete(`/admin/members/${memberId}`);
        showMessage('Member deleted successfully', 'success');
        fetchMembers();
        // Also refresh stats if we're on overview tab
        if (activeTab === 'overview') {
          fetchStats();
        }
      } catch (error) {
        console.error('Delete error:', error);
        showMessage('Failed to delete member', 'error');
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
                        <button
                          className="btn btn-small"
                          style={{ backgroundColor: '#dc3545', color: 'white', border: '1px solid #dc3545' }}
                          onClick={() => handleDeleteMember(member._id, member.name, member.reg_number)}
                        >
                          Delete
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

  const renderPublicity = () => (
    <div>
      <h3>Publicity Duty Capacity Management</h3>
      
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {/* Publicity Statistics */}
          <div className="grid grid-3" style={{ marginBottom: '24px' }}>
            <div className="card">
              <h4>Total with Publicity</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                {publicityStats.total_members_with_publicity || 0}
              </div>
            </div>
            
            <div className="card">
              <h4>C2C Assignments</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                {publicityStats.by_duty_type?.C2C || 0}
              </div>
            </div>
            
            <div className="card">
              <h4>Helpdesk Assignments</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
                {publicityStats.by_duty_type?.HELPDESK || 0}
              </div>
            </div>
          </div>

          {/* Capacity Management Grid */}
          <div className="card">
            <h4>Slot Capacity Settings</h4>
            <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
              <strong>Instructions:</strong> Each slot can be configured with different capacity limits for C2C and Helpdesk duties.
            </p>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
              • <strong>Used:</strong> Current number of students assigned<br/>
              • <strong>Capacity:</strong> Maximum number of students allowed (click to edit)<br/>
              • Default capacity is 5 per duty type per slot
            </p>

            {/* Bulk Capacity Update Controls */}
            <div style={{ 
              marginBottom: '24px', 
              padding: '16px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h5 style={{ marginBottom: '16px', color: '#495057' }}>
                🚀 Bulk Capacity Update
              </h5>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                Change all slot capacities at once instead of editing each one individually.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* C2C Bulk Update */}
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: '6px',
                  border: '1px solid #d1e7dd'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#28a745',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    🟢 Update All C2C Capacities
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={bulkCapacityC2C}
                      onChange={(e) => setBulkCapacityC2C(parseInt(e.target.value) || 1)}
                      style={{ 
                        width: '70px',
                        height: '36px',
                        border: '2px solid #28a745',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        backgroundColor: 'white'
                      }}
                    />
                    <button
                      onClick={() => updateAllCapacities('C2C', bulkCapacityC2C)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        height: '36px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? 'Updating...' : 'Update All C2C'}
                    </button>
                  </div>
                </div>

                {/* Helpdesk Bulk Update */}
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#e1f7fe', 
                  borderRadius: '6px',
                  border: '1px solid #b8daff'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#17a2b8',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    🔵 Update All Helpdesk Capacities
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={bulkCapacityHelpdesk}
                      onChange={(e) => setBulkCapacityHelpdesk(parseInt(e.target.value) || 1)}
                      style={{ 
                        width: '70px',
                        height: '36px',
                        border: '2px solid #17a2b8',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        backgroundColor: 'white'
                      }}
                    />
                    <button
                      onClick={() => updateAllCapacities('HELPDESK', bulkCapacityHelpdesk)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        height: '36px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? 'Updating...' : 'Update All Helpdesk'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '12px', 
                fontSize: '12px', 
                color: '#666',
                textAlign: 'center'
              }}>
                ⚠️ This will update all 50 slots (5 days × 10 slots) for the selected duty type
              </div>
            </div>
            
            <h5 style={{ marginBottom: '12px', color: '#495057' }}>Individual Slot Settings</h5>
            
            <div className="timetable-grid">
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <div key={dayIndex} className="day-column">
                  <div className="day-title">{dayLabel}</div>
                  {SLOT_LABELS.map((slotLabel, slotIndex) => {
                    const day = dayIndex + 1;
                    const slot = slotIndex + 1;
                    
                    // Find existing capacities for this slot
                    const c2cCapacity = publicityCapacities.find(c => 
                      c.day === day && c.slot === slot && c.duty_type === 'C2C'
                    );
                    const helpdeskCapacity = publicityCapacities.find(c => 
                      c.day === day && c.slot === slot && c.duty_type === 'HELPDESK'
                    );
                    
                    // Get current usage from stats
                    const c2cUsed = publicityStats.slot_usage?.[day]?.[slot]?.C2C || 0;
                    const helpdeskUsed = publicityStats.slot_usage?.[day]?.[slot]?.HELPDESK || 0;
                    
                    return (
                      <div key={slotIndex} className="slot-capacity-admin">
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          marginBottom: '12px',
                          textAlign: 'center',
                          padding: '8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px'
                        }}>
                          Slot {slot}<br/>
                          <small style={{ fontSize: '12px', color: '#666' }}>{slotLabel}</small>
                        </div>
                        
                        {/* C2C Capacity */}
                        <div style={{ 
                          marginBottom: '12px', 
                          padding: '12px', 
                          backgroundColor: '#e8f5e8', 
                          borderRadius: '6px',
                          border: '1px solid #d1e7dd'
                        }}>
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            color: '#28a745',
                            marginBottom: '8px',
                            textAlign: 'center'
                          }}>
                            C2C
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            marginBottom: '6px'
                          }}>
                            <span>Used: <strong>{c2cUsed}</strong></span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between'
                          }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Capacity:</label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={c2cCapacity?.capacity || 5}
                              onChange={(e) => updateCapacity(day, slot, 'C2C', parseInt(e.target.value))}
                              style={{ 
                                width: '60px', 
                                height: '32px',
                                border: '2px solid #28a745', 
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                backgroundColor: 'white'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Helpdesk Capacity */}
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#e1f7fe', 
                          borderRadius: '6px',
                          border: '1px solid #b8daff'
                        }}>
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            color: '#17a2b8',
                            marginBottom: '8px',
                            textAlign: 'center'
                          }}>
                            Helpdesk
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            marginBottom: '6px'
                          }}>
                            <span>Used: <strong>{helpdeskUsed}</strong></span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between'
                          }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Capacity:</label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={helpdeskCapacity?.capacity || 5}
                              onChange={(e) => updateCapacity(day, slot, 'HELPDESK', parseInt(e.target.value))}
                              style={{ 
                                width: '60px', 
                                height: '32px',
                                border: '2px solid #17a2b8', 
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                backgroundColor: 'white'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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
          <button
            className={`btn ${activeTab === 'publicity' ? '' : 'btn-secondary'}`}
            onClick={() => setActiveTab('publicity')}
          >
            Publicity Capacity
          </button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'publicity' && renderPublicity()}
      </div>
    </div>
  );
};

export default AdminDashboard;
