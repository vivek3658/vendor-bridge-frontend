import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected period filters (defaults to current month/year)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/summary?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch report summary.');
      }
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedYear]);

  // Export report as CSV with Bearer Authentication
  const handleExport = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('vb_token');

    try {
      setSuccess('Generating export CSV...');
      const response = await fetch(`${API_BASE_URL}/api/reports/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to generate export file.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `procurement_report_${selectedYear}_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setSuccess('CSV Report downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper to format amount in Lakhs (L) or thousands
  const formatAmountLakhs = (val) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (!data) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading Analytics Summary...</div>
      </div>
    );
  }

  // Calculate max spend for Category and Monthly trend scaling
  const maxCategorySpend = data.spendByCategory?.reduce((max, c) => (c.totalSpend > max ? c.totalSpend : max), 1) || 1;
  const maxTrendSpend = data.monthlyTrend?.reduce((max, t) => (t.spend > max ? t.spend : max), 1) || 1;

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Reports & analytics</h1>
            <p style={styles.subtitle}>
              Procurement Insights - {monthsList.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>
          
          <div style={styles.controlsRow}>
            {/* Month Select */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={styles.selectFilter}
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={styles.selectFilter}
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>

            {/* Export button */}
            <button onClick={handleExport} className="btn btn-secondary" style={styles.exportBtn}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Analytics stats row */}
        <div style={styles.statsRow}>
          <div className="glass-panel animate-fade-in" style={styles.statCard}>
            <span style={styles.statLabel}>total spend</span>
            <span style={styles.statValue}>{formatAmountLakhs(data.cards?.totalSpend || 0)}</span>
          </div>

          <div className="glass-panel animate-fade-in" style={styles.statCard}>
            <span style={styles.statLabel}>Active vendors</span>
            <span style={{ ...styles.statValue, color: '#10b981' }}>{data.cards?.activeVendors || 0}</span>
          </div>

          <div className="glass-panel animate-fade-in" style={styles.statCard}>
            <span style={styles.statLabel}>PO Fulfillment</span>
            <span style={{ ...styles.statValue, color: '#f57f17' }}>{data.cards?.poFulfillment || '0%'}</span>
          </div>

          <div className="glass-panel animate-fade-in" style={styles.statCard}>
            <span style={styles.statLabel}>overdue invoices</span>
            <span style={{ ...styles.statValue, color: 'var(--accent)' }}>{data.cards?.overdueInvoices || 0}</span>
          </div>
        </div>

        {/* Main analytical sections */}
        <div style={styles.mainGrid}>
          {/* Spend By Category */}
          <div className="glass-panel" style={styles.gridCard}>
            <h3 style={styles.cardHeader}>SPEND BY CATEGORY</h3>
            {data.spendByCategory?.length === 0 ? (
              <div style={styles.placeholderText}>No category spending recorded for this month.</div>
            ) : (
              <div style={styles.categoryList}>
                {data.spendByCategory?.map((c, idx) => {
                  const percentage = Math.max(5, (c.totalSpend / maxCategorySpend) * 100);
                  return (
                    <div key={idx} style={styles.categoryItem}>
                      <div style={styles.categoryMeta}>
                        <span style={styles.categoryName}>{c.category}</span>
                        <span style={styles.categoryVal}>{formatAmountLakhs(c.totalSpend)}</span>
                      </div>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right layout block */}
          <div style={styles.rightLayoutBlock}>
            {/* Top Vendors by Spend */}
            <div className="glass-panel" style={styles.subCard}>
              <h3 style={styles.cardHeader}>TOP VENDORS BY SPEND</h3>
              {data.topVendors?.length === 0 ? (
                <div style={styles.placeholderText}>No vendor spend recorded.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Vendor</th>
                      <th style={styles.th}>Spend (₹)</th>
                      <th style={styles.th}>POs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topVendors?.map((v, idx) => (
                      <tr key={idx} style={styles.trRow}>
                        <td style={styles.td}><strong>{v.vendorName}</strong></td>
                        <td style={styles.td}>₹{(v.spend || 0).toLocaleString()}</td>
                        <td style={styles.td}>{v.poCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Monthly Trends */}
            <div className="glass-panel" style={styles.subCard}>
              <h3 style={styles.cardHeader}>MONTHLY TREND</h3>
              <div style={styles.chartContainer}>
                {data.monthlyTrend?.map((trend, idx) => {
                  const height = Math.max(10, Math.min(100, (trend.spend / maxTrendSpend) * 100));
                  return (
                    <div key={idx} style={styles.chartBarCol}>
                      <div style={styles.chartBarTrack}>
                        <div style={{ ...styles.chartBarFill, height: `${height}%` }} title={`₹${trend.spend.toLocaleString()}`} />
                      </div>
                      <span style={styles.chartLabel}>{trend.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  controlsRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  selectFilter: {
    backgroundColor: '#ffffff',
    border: '1.5px solid #d1d9e6',
    padding: '10px 14px',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    borderRadius: '6px',
    outline: 'none',
    boxShadow: 'var(--shadow-raised-sm)',
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '0.92rem',
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
  },
  statLabel: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--primary)',
    fontFamily: 'var(--font-heading)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '30px',
    alignItems: 'start',
  },
  gridCard: {
    padding: '28px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    minHeight: '480px',
    textAlign: 'left',
  },
  cardHeader: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '8px',
    textAlign: 'left',
  },
  placeholderText: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-dim)',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  categoryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  categoryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  categoryName: {
    color: 'var(--text-main)',
  },
  categoryVal: {
    color: 'var(--primary)',
  },
  barTrack: {
    height: '12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-recessed-light)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(to right, var(--primary) 0%, #6366f1 100%)',
    borderRadius: '6px',
  },
  rightLayoutBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  subCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
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
    padding: '10px 14px',
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
    padding: '10px 14px',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '130px',
    paddingTop: '10px',
  },
  chartBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '40px',
    height: '100%',
  },
  chartBarTrack: {
    height: '100px',
    width: '18px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-recessed-light)',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    background: 'linear-gradient(to top, #10b981 0%, #34d399 100%)',
    borderRadius: '10px',
    boxShadow: '0 -2px 5px rgba(16, 185, 129, 0.2)',
  },
  chartLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginTop: '6px',
  }
};
