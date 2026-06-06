import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Vendors', path: '/vendors', icon: '🏢', adminOnly: true },
  { label: "RFQ's", path: '/rfqs', icon: '📝' },
  { label: 'Quotations', path: '/quotations', icon: '💬' },
  { label: 'Approvals', path: '/approvals', icon: '✅' },
  { label: 'Purchase orders', path: '/purchase-orders', icon: '📦' },
  { label: 'Invoices', path: '/invoices', icon: '📄' },
  { label: 'Reports', path: '/reports', icon: '📈' },
  { label: 'Activity', path: '/activity', icon: '🔔' }
];

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    const token = localStorage.getItem('vb_token');

    if (!token || !storedUser) {
      localStorage.removeItem('vb_token');
      localStorage.removeItem('vb_user');
      navigate('/auth');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    navigate('/auth');
  };

  if (!user) return null;

  // Filter items based on user role (Vendors requires Admin role)
  const filteredItems = SIDEBAR_ITEMS.filter(item => {
    if (item.adminOnly && user.role !== 'Admin') {
      return false;
    }
    return true;
  });

  const getPageTitle = () => {
    const item = SIDEBAR_ITEMS.find(i => i.path === location.pathname);
    return item ? item.label : 'VendorBridge ERP';
  };

  const getAvatarUrl = () => {
    return `${API_BASE_URL}/api/auth/user-image/${encodeURIComponent(user.username)}`;
  };

  return (
    <div style={styles.layoutContainer}>
      {/* Sidebar */}
      <aside className="glass-panel" style={styles.sidebar}>
        <div style={styles.logoWrapper}>
          <span style={styles.logoText}>VendorBridge</span>
          <span style={styles.logoBadge}>ERP</span>
        </div>

        <nav style={styles.navMenu}>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.activeNavLink : {})
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
                {isActive && <div style={styles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBrief}>
            <div style={styles.userBriefDetails}>
              <div style={styles.userName}>{user.username}</div>
              <div style={styles.userRole}>{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.mainContentWrapper}>
        {/* Top Header */}
        <header className="glass-panel" style={styles.header}>
          <div style={styles.headerTitleSection}>
            <h1 style={styles.headerTitle}>{getPageTitle()}</h1>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.profileIndicator}>
              <img
                src={getAvatarUrl()}
                alt="Avatar"
                style={styles.avatarImg}
                onError={(e) => {
                  e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                }}
              />
              <span style={styles.badge}>{user.role}</span>
            </div>
            
            <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main style={styles.pageViewport}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  layoutContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  sidebar: {
    width: '260px',
    borderRadius: '0',
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    background: 'rgba(11, 15, 25, 0.85)',
  },
  logoWrapper: {
    padding: '30px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--border-light)',
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.4rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  logoBadge: {
    fontSize: '0.7rem',
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--primary)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '700',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  navMenu: {
    padding: '24px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    overflowY: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    position: 'relative',
    transition: 'all 0.2s',
  },
  activeNavLink: {
    background: 'rgba(99, 102, 241, 0.12)',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  navIcon: {
    marginRight: '12px',
    fontSize: '1.2rem',
  },
  navLabel: {
    flex: 1,
  },
  activeIndicator: {
    width: '4px',
    height: '20px',
    background: 'var(--primary)',
    borderRadius: '2px',
    position: 'absolute',
    left: '0',
    boxShadow: '0 0 10px var(--primary)',
  },
  sidebarFooter: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-light)',
  },
  userBrief: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userBriefDetails: {
    textAlign: 'left',
  },
  userName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
  },
  mainContentWrapper: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: 'calc(100% - 260px)',
  },
  header: {
    height: '70px',
    borderRadius: '0',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 9,
    background: 'rgba(9, 13, 22, 0.7)',
  },
  headerTitleSection: {
    textAlign: 'left',
  },
  headerTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  profileIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatarImg: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid var(--primary)',
  },
  badge: {
    fontSize: '0.75rem',
    background: 'rgba(244, 63, 94, 0.15)',
    color: 'var(--accent)',
    padding: '2px 8px',
    borderRadius: '20px',
    fontWeight: '600',
    border: '1px solid rgba(244, 63, 94, 0.3)',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  pageViewport: {
    padding: '32px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }
};
