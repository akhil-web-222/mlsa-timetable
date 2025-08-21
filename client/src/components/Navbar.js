import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ children }) => {
  return (
    <div className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <img 
            src="/mlsa-logo.jpg" 
            alt="MLSA Logo" 
            style={{ 
              height: '40px', 
              marginRight: '12px', 
              verticalAlign: 'middle' 
            }} 
          />
          MLSA Timetable System
        </Link>
        <nav className="navbar-nav">
          {children}
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
