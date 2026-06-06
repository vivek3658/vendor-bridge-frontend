import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load user session and dashboard stats
  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    const token = localStorage.getItem('vb_token');
    
    if (!token || !storedUser) {
      localStorage.removeItem('vb_token');
      localStorage.removeItem('vb_user');
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    // Fetch dashboard overview stats
    const fetchOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch overview metrics.');
        }
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    navigate('/auth');
  };

  if (!user || !data) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>{loading ? 'Loading Overview...' : 'Loading Session...'}</div>
      </div>
    );
  }

  // Calculate max spend for trend charts scaling
  const maxSpend = data.spendingTrends?.reduce((max, t) => (t.spend > max ? t.spend : max), 1) || 1;

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Error */}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>{data.welcomeMessage || `Welcome back, ${user.firstName}!`}</p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.profileIndicator}>
              <img 
                src={`${API_BASE_URL}/api/auth/user-image/${encodeURIComponent(user.username)}`} 
                alt="Avatar" 
                style={styles.avatarMini} 
                onError={(e) => {
                  e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                }}
              />
              <span style={styles.profileText}>@{user.username} ({user.role})</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div className="glass-panel" style={styles.statCard}>
            <span style={styles.statValue}>{data.cards?.activeRfqs || 0}</span>
            <span style={styles.statLabel}>Active RFQ's</span>
          </div>
          
          <div className="glass-panel" style={styles.statCard}>
            <span style={styles.statValue}>{data.cards?.pendingApprovals || 0}</span>
            <span style={styles.statLabel}>Pending Approvals</span>
          </div>

          <div className="glass-panel" style={styles.statCard}>
            <span style={styles.statValue}>
              {user.role === 'Vendor' ? '₹' : '₹'}{data.cards?.posThisMonth?.formatted || 0}
            </span>
            <span style={styles.statLabel}>POs this month</span>
          </div>

          <div className="glass-panel" style={styles.statCard}>
            <span style={{ ...styles.statValue, color: 'var(--accent)' }}>
              {data.cards?.overdueInvoices || 0}
            </span>
            <span style={styles.statLabel}>overdue invoices</span>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div style={styles.mainGrid}>
          {/* Left Column: Recent POs */}
          <div className="glass-panel" style={styles.gridCard}>
            <h3 style={styles.cardTitle}>Recent Purchase Orders</h3>
            {data.recentPurchaseOrders?.length === 0 ? (
              <div style={styles.noDataText}>No recent purchase orders found.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>PO#</th>
                    <th style={styles.th}>Vendor</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPurchaseOrders?.map((po, index) => (
                    <tr key={index} style={styles.trRow}>
                      <td style={styles.td}><strong>{po.poNumber}</strong></td>
                      <td style={styles.td}>{po.vendor}</td>
                      <td style={styles.td}>₹{(po.amount || 0).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: po.status === 'Paid' ? '#d1fae5' : '#fffbeb',
                            color: po.status === 'Paid' ? '#065f46' : '#b45309',
                            borderColor: po.status === 'Paid' ? '#a7f3d0' : '#fde68a',
                          }}
                        >
                          {po.status === 'Paid' ? 'Approved' : po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right Column: Spending Trends Chart */}
          <div className="glass-panel" style={styles.gridCard}>
            <h3 style={styles.cardTitle}>Spending Trends last 6 months</h3>
            <div style={styles.chartContainer}>
              {data.spendingTrends?.map((trend, idx) => {
                const heightPercentage = Math.max(10, Math.min(100, (trend.spend / maxSpend) * 100));
                return (
                  <div key={idx} style={styles.chartBarCol}>
                    <div style={styles.barTrack}>
                      <div 
                        style={{ 
                          ...styles.barFill, 
                          height: `${heightPercentage}%` 
                        }}
                        title={`₹${trend.spend.toLocaleString()}`}
                      />
                    </div>
                    <span style={styles.barLabel}>{trend.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer Row */}
        <div style={styles.quickActionsRow}>
          {user.role !== 'Vendor' && (
            <button onClick={() => navigate('/rfqs')} className="btn btn-secondary" style={styles.actionBtn}>
              + new RFQ
            </button>
          )}
          {user.role === 'Admin' && (
            <button onClick={() => navigate('/vendors')} className="btn btn-secondary" style={styles.actionBtn}>
              Add Vendor
            </button>
          )}
          <button onClick={() => navigate('/invoices')} className="btn btn-secondary" style={styles.actionBtn}>
            view Invoices
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-main)',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-main)',
  },
  loadingText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  profileIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ffffff',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #d1d9e6',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  avatarMini: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid var(--primary)',
  },
  profileText: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: '0 0 6px 0',
    textAlign: 'left',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '1.05rem',
    margin: 0,
    textAlign: 'left',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: 'var(--primary)',
    fontFamily: 'var(--font-heading)',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    marginBottom: '32px',
    alignItems: 'start',
  },
  gridCard: {
    padding: '28px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    minHeight: '340px',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '8px',
    textAlign: 'left',
  },
  noDataText: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-dim)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '12px 16px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: '#ffffff',
  },
  td: {
    padding: '12px 16px',
    fontSize: '0.92rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700',
    border: '1px solid',
  },
  quickActionsRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-start',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '24px',
  },
  actionBtn: {
    padding: '12px 28px',
    fontSize: '0.98rem',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #d1d9e6',
    boxShadow: 'var(--shadow-raised-sm)',
    cursor: 'pointer',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '200px',
    paddingTop: '20px',
  },
  chartBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '40px',
    height: '100%',
  },
  barTrack: {
    height: '150px',
    width: '18px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-recessed-light)',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    background: 'linear-gradient(to top, var(--primary) 0%, #6366f1 100%)',
    borderRadius: '10px',
    boxShadow: '0 -2px 5px rgba(79, 70, 229, 0.2)',
  },
  barLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginTop: '8px',
  }
};
