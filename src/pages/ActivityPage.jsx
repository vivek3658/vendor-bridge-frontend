import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selected filter tab
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'RFQ' | 'Approvals' | 'Invoices'

  // Fetch activities from backend
  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/activities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch activity logs.');
      }
      setLogs(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Filter logs based on active tab
  const filteredLogs = logs.filter(log => {
    if (activeTab === 'All') return true;
    if (activeTab === 'RFQ') {
      return ['RFQ_CREATED', 'RFQ_PUBLISHED', 'RFQ_INVITATION'].includes(log.action);
    }
    if (activeTab === 'Approvals') {
      return ['QUOTATION_SUBMITTED', 'QUOTATION_APPROVED', 'QUOTATION_REJECTED'].includes(log.action);
    }
    if (activeTab === 'Invoices') {
      return ['PO_GENERATED', 'PO_PAID'].includes(log.action);
    }
    return true;
  });

  // Get action details: icon, title, background color
  const getActionDetails = (action) => {
    switch (action) {
      case 'QUOTATION_APPROVED':
      case 'PO_PAID':
        return {
          icon: '✓',
          bg: '#e8f5e9',
          color: '#2e7d32',
          borderColor: '#c8e6c9'
        };
      case 'QUOTATION_REJECTED':
        return {
          icon: '✕',
          bg: '#ffebee',
          color: '#c62828',
          borderColor: '#ffcdd2'
        };
      case 'RFQ_PUBLISHED':
      case 'RFQ_INVITATION':
        return {
          icon: '📄',
          bg: '#e3f2fd',
          color: '#1565c0',
          borderColor: '#bbdefb'
        };
      case 'QUOTATION_SUBMITTED':
      case 'PO_GENERATED':
        return {
          icon: '🕒',
          bg: '#fff8e1',
          color: '#f57f17',
          borderColor: '#ffe082'
        };
      default:
        return {
          icon: '⚙️',
          bg: '#f5f5f5',
          color: '#616161',
          borderColor: '#e0e0e0'
        };
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Error */}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Activity & Logs</h1>
            <p style={styles.subtitle}>Procurement audit trail</p>
          </div>
        </div>

        {/* Filter Tabs - Skeuomorphic */}
        <div style={styles.tabsContainer}>
          {['All', 'RFQ', 'Approvals', 'Invoices'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabBtn,
                  ...(isActive ? styles.tabBtnActive : {})
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Timeline Container */}
        <div className="glass-panel animate-fade-in" style={styles.timelineCard}>
          {loading ? (
            <div style={styles.placeholder}>Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={styles.placeholder}>No activity logs match the selected filter.</div>
          ) : (
            <div style={styles.timelineList}>
              {filteredLogs.map((log) => {
                const details = getActionDetails(log.action);
                return (
                  <div key={log._id} style={styles.timelineItem}>
                    {/* Icon Column */}
                    <div
                      style={{
                        ...styles.iconCircle,
                        backgroundColor: details.bg,
                        color: details.color,
                        borderColor: details.borderColor
                      }}
                    >
                      {details.icon}
                    </div>

                    {/* Content Column */}
                    <div style={styles.contentCol}>
                      <div style={styles.logMessage}>
                        {log.message}
                      </div>
                      <div style={styles.logMeta}>
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                        {log.user && ` • by @${log.user.username || log.user}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
  tabsContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  tabBtn: {
    background: '#ffffff',
    border: '1.5px solid #d1d9e6',
    color: 'var(--text-muted)',
    padding: '10px 24px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-raised-sm)',
    transition: 'all 0.15s ease-in-out',
    fontFamily: 'var(--font-primary)',
  },
  tabBtnActive: {
    border: '1.5px solid var(--primary)',
    backgroundColor: '#ffffff',
    color: 'var(--primary)',
    boxShadow: 'inset 2px 2px 5px #cbd5e1',
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: 'var(--shadow-raised)',
    padding: '30px',
  },
  placeholder: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-dim)',
  },
  timelineList: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    textAlign: 'left',
  },
  timelineItem: {
    display: 'flex',
    gap: '20px',
    paddingBottom: '24px',
    position: 'relative',
    '&:not(:last-child)::after': {
      content: '""',
      position: 'absolute',
      left: '20px',
      top: '40px',
      bottom: 0,
      width: '2px',
      backgroundColor: 'var(--border-light)',
    }
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.1rem',
    border: '1.5px solid',
    flexShrink: 0,
    boxShadow: 'var(--shadow-raised-sm)',
  },
  contentCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logMessage: {
    fontSize: '1.05rem',
    color: 'var(--text-main)',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  logMeta: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '6px',
  }
};
