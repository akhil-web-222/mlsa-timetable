import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

function ThankYou() {
  const location = useLocation();
  const isUpdate = location.state?.isUpdate || false;
  const memberName = location.state?.memberName || '';

  return (
    <div className="container">
      <Navbar />
      
      <div className="main-content">
        <div className="success-container">
          <div className="success-icon">
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#28a745" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </div>
          
          <h1 className="success-title">
            {isUpdate ? 'Timetable Updated!' : 'Thank You for Submitting!'}
          </h1>
          
          <div className="success-message">
            {memberName && (
              <p className="member-greeting">Hi {memberName}!</p>
            )}
            <p>
              {isUpdate 
                ? 'Your timetable has been successfully updated. The admin team will review your new availability slots.'
                : 'Your timetable has been successfully submitted. The admin team will review your availability and get back to you soon.'
              }
            </p>
          </div>
          
          <div className="success-actions">
            <Link to="/status" className="btn btn-primary">
              Check My Status
            </Link>
            
            <Link to="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default ThankYou;
