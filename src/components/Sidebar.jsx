import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Vendors', path: '/vendors' },
  { label: "RFQ's", path: '/rfqs' },
  { label: 'Quotations', path: '/quotations' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Purchase orders', path: '/purchase-orders' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Reports', path: '/reports' },
  { label: 'Activity', path: '/activity' }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem('vb_user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user ? user.role : '';

  const handleNavigate = (path) => {
    navigate(path);
  };

  const filteredItems = SIDEBAR_ITEMS.filter((item) => {
    if (item.path === '/vendors' && role !== 'Admin') return false;
    if (item.path === '/approvals' && role !== 'Admin' && role !== 'Manager') return false;
    if (item.path === '/reports' && role === 'Vendor') return false;
    return true;
  });

  return (
    <aside style={styles.sidebar}>
      <div style={styles.topContainer}>
        <div style={styles.sidebarBrand}>
          <span style={styles.brandTitle}>VendorBridge</span>
        </div>
        <div style={styles.menuList}>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.activeMenuItem : {})
                }}
              >
                - {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {user && (
        <div 
          onClick={() => handleNavigate('/profile')}
          style={styles.profileWidget}
          className="profile-widget-btn no-print"
        >
          <img 
            src={`${API_BASE_URL}/api/auth/user-image/${encodeURIComponent(user.username)}`} 
            alt="Avatar" 
            style={styles.profileWidgetAvatar} 
            onError={(e) => {
              e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
            }}
          />
          <div style={styles.profileWidgetDetails}>
            <span style={styles.profileWidgetName}>
              {user.firstName} {user.lastName}
            </span>
            <span style={styles.profileWidgetRole}>
              {user.role}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid #d1d9e6',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    padding: '20px 10px',
    boxSizing: 'border-box',
    boxShadow: 'inset -2px 0 5px rgba(0,0,0,0.02)',
  },
  sidebarBrand: {
    padding: '10px 15px 25px 15px',
    borderBottom: '1px solid #d1d9e6',
    marginBottom: '20px',
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    letterSpacing: '0.5px',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  menuItem: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-muted)',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '1.05rem',
    cursor: 'pointer',
    borderRadius: '6px',
    fontFamily: 'var(--font-primary)',
    fontWeight: '500',
    width: '100%',
    transition: 'all 0.15s ease-in-out',
  },
  activeMenuItem: {
    border: '1.5px solid #22c55e',
    backgroundColor: '#ffffff',
    color: '#15803d',
    fontWeight: '600',
    boxShadow: 'inset 2px 2px 5px #cbd5e1',
  },
  topContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  profileWidget: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-raised-sm)',
    transition: 'all 0.2s ease-in-out',
    textAlign: 'left',
  },
  profileWidgetAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1.5px solid var(--primary)',
    backgroundColor: '#f8fafc',
  },
  profileWidgetDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  profileWidgetName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  profileWidgetRole: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
  }
};
