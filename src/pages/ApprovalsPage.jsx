import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteIdFromUrl = searchParams.get('quoteId');

  const [user, setUser] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected quotation for active approval workflow
  const [activeQuote, setActiveQuote] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch pending quotations (status: Submitted)
  const fetchPendingQuotations = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch quotations.');
      }
      
      // Filter list to show Submitted bids
      const pendingBids = (result.data || []).filter(q => q.status === 'Submitted');
      setQuotations(pendingBids);

      // If quoteId was passed in URL, load it directly
      if (quoteIdFromUrl) {
        const target = result.data.find(q => q._id === quoteIdFromUrl);
        if (target) {
          setActiveQuote(target);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQuotations();
  }, [quoteIdFromUrl]);

  // Approve action
  const handleApprove = async () => {
    if (!activeQuote) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    const token = localStorage.getItem('vb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotations/${activeQuote._id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remarks })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to approve quotation.');
      }

      setSuccess('Quotation approved! Purchase Order generated successfully.');
      setActiveQuote(null);
      setRemarks('');
      
      // Clear URL parameter and reload
      navigate('/approvals');
      fetchPendingQuotations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!activeQuote) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    const token = localStorage.getItem('vb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotations/${activeQuote._id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remarks })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reject quotation.');
      }

      setSuccess('Quotation rejected successfully.');
      setActiveQuote(null);
      setRemarks('');

      navigate('/approvals');
      fetchPendingQuotations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        {!activeQuote ? (
          /* PENDING APPROVALS LIST */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Procurement Approvals</h1>
                <p style={styles.subtitle}>Review vendor bids and process workflows</p>
              </div>
            </div>

            <div className="glass-panel animate-fade-in" style={styles.tableCard}>
              {loading ? (
                <div style={styles.tablePlaceholder}>Loading approvals list...</div>
              ) : quotations.length === 0 ? (
                <div style={styles.tablePlaceholder}>No quotations awaiting approval.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Quotation ID</th>
                      <th style={styles.th}>RFQ Title</th>
                      <th style={styles.th}>Vendor</th>
                      <th style={styles.th}>Total Amount</th>
                      <th style={styles.th}>Proposed Items</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((quote) => (
                      <tr key={quote._id} style={styles.trRow}>
                        <td style={styles.td}><strong>{quote.quotationNumber}</strong></td>
                        <td style={styles.td}>{quote.rfqId?.title || 'N/A'}</td>
                        <td style={styles.td}>@{quote.vendorId?.username || 'N/A'}</td>
                        <td style={styles.td}>₹{(quote.totalAmount || 0).toLocaleString()}</td>
                        <td style={styles.td}>{quote.items?.length || 0} items proposed</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => setActiveQuote(quote)}
                            className="btn btn-primary"
                            style={styles.actionBtn}
                          >
                            Review & Process
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          /* APPROVAL WORKFLOW DETAIL VIEW - SCREEN 8 */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Approval Workflow</h1>
                <p style={styles.subtitle}>
                  RFQ: {activeQuote.rfqId?.title || 'RFQ Reference'} - Vendor: {activeQuote.vendorId?.firstName} {activeQuote.vendorId?.lastName} - ₹{(activeQuote.totalAmount || 0).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => {
                  setActiveQuote(null);
                  navigate('/approvals');
                }} 
                className="btn btn-secondary"
              >
                Back to List
              </button>
            </div>

            {/* Workflow steps */}
            <div style={styles.stepsContainer}>
              <div style={styles.stepGroup}>
                <div style={styles.stepCircleActive}>1</div>
                <span style={styles.stepLabel}>Submitted</span>
              </div>
              <div style={styles.stepConnectorActive} />
              
              <div style={styles.stepGroup}>
                <div style={styles.stepCircleActive}>2</div>
                <span style={styles.stepLabel}>L1 Review</span>
              </div>
              <div style={styles.stepConnectorActive} />
              
              <div style={styles.stepGroup}>
                <div style={styles.stepCircleHighlight}>3</div>
                <span style={{ ...styles.stepLabel, fontWeight: '700', color: 'var(--primary)' }}>L2 approval</span>
              </div>
              <div style={styles.stepConnector} />
              
              <div style={styles.stepGroup}>
                <div style={styles.stepCircle}>4</div>
                <span style={styles.stepLabel}>Generate PO</span>
              </div>
            </div>

            <div style={styles.workflowGrid}>
              {/* Left Column: Chain & Remarks */}
              <div style={styles.workflowLeft}>
                {/* Approval Chain Checklist */}
                <div className="glass-panel" style={styles.workflowCard}>
                  <h3 style={styles.cardHeader}>APPROVAL CHAIN</h3>
                  <div style={styles.chainList}>
                    {/* L1 Checked approved */}
                    <div style={styles.chainItem}>
                      <div style={styles.chainStatusIconCheck}>✓</div>
                      <div style={styles.chainDetails}>
                        <div style={styles.chainUser}>
                          {activeQuote.rfqId?.createdBy
                            ? `${activeQuote.rfqId.createdBy.firstName} ${activeQuote.rfqId.createdBy.lastName} (${activeQuote.rfqId.createdBy.role || 'Procurement Officer'})`
                            : 'Rahul Mehta (Procurement Officer)'}
                        </div>
                        <div style={styles.chainStateText}>
                          Approved on {activeQuote.createdAt 
                            ? new Date(activeQuote.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'May 20, 10:32 AM'}
                        </div>
                      </div>
                    </div>

                    {/* L2 Awaiting Clock */}
                    <div style={styles.chainItem}>
                      <div style={styles.chainStatusIconClock}>🕒</div>
                      <div style={styles.chainDetails}>
                        <div style={styles.chainUser}>
                          {user
                            ? `${user.firstName} ${user.lastName} (${user.role})`
                            : 'Priya Shah (Finance manager)'}
                        </div>
                        <div style={styles.chainStateTextWait}>
                          Awaiting - Assigned {activeQuote.createdAt 
                            ? new Date(activeQuote.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'May 21'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remarks textarea */}
                <div className="glass-panel" style={styles.workflowCard}>
                  <h3 style={styles.cardHeader}>Approval Remarks</h3>
                  <textarea
                    className="form-input"
                    placeholder="Add your comments or conditions...."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={styles.remarksTextarea}
                  />
                </div>
              </div>

              {/* Right Column: Bid Summary & Actions */}
              <div style={styles.workflowRight}>
                <div className="glass-panel" style={styles.summaryBox}>
                  <h3 style={styles.cardHeader}>QUOTATIONS SUMMARY</h3>
                  <div style={styles.summaryDetails}>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Vendor:</span>
                      <span style={styles.summaryValue}>
                        {activeQuote.vendorId?.firstName} {activeQuote.vendorId?.lastName}
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Total:</span>
                      <span style={styles.summaryValueTotal}>
                        ₹{(activeQuote.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Delivery:</span>
                      <span style={styles.summaryValue}>
                        {activeQuote.items ? Math.max(...activeQuote.items.map(i => i.deliveryDays || 0)) : 10} days
                      </span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Rating:</span>
                      <span style={styles.summaryValue}>
                        {activeQuote.vendorId?.rating || 0}/5
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div style={styles.actionsRow}>
                    <button
                      onClick={handleApprove}
                      className="btn btn-primary"
                      style={styles.actionButton}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={handleReject}
                      className="btn btn-secondary"
                      style={{ ...styles.actionButton, borderColor: '#fca5a5', color: '#991b1b', backgroundColor: '#fef2f2' }}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '1.05rem',
    margin: 0,
  },
  tableCard: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: 'var(--shadow-raised)',
  },
  tablePlaceholder: {
    padding: '50px',
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
    padding: '16px 20px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  trRow: {
    borderBottom: '1px solid var(--border-light)',
    backgroundColor: '#ffffff',
    '&:hover': {
      backgroundColor: '#f8fafc',
    }
  },
  td: {
    padding: '16px 20px',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  actionBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    borderRadius: '4px',
  },
  /* Steps bar */
  stepsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '35px',
    gap: '8px',
  },
  stepGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  stepCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: '1px solid #d1d9e6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    color: 'var(--text-muted)',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  stepCircleActive: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#047857',
    boxShadow: 'inset 1px 1px 3px #cbd5e1',
  },
  stepCircleHighlight: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '2.5px solid var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  stepConnector: {
    height: '2px',
    width: '80px',
    backgroundColor: '#d1d9e6',
    marginTop: '-20px', // offset labels height
  },
  stepConnectorActive: {
    height: '2.5px',
    width: '80px',
    backgroundColor: '#10b981',
    marginTop: '-20px', // offset labels height
  },
  stepLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  /* Detail columns */
  workflowGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    marginBottom: '30px',
  },
  workflowLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  workflowCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    textAlign: 'left',
  },
  cardHeader: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '8px',
  },
  chainList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chainItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  chainStatusIconCheck: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1.5px solid #a7f3d0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
  },
  chainStatusIconClock: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#fffbeb',
    color: '#b45309',
    border: '1.5px solid #fde68a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
  },
  chainDetails: {
    textAlign: 'left',
  },
  chainUser: {
    fontWeight: '600',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
  },
  chainStateText: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  chainStateTextWait: {
    fontSize: '0.82rem',
    color: '#b45309',
    marginTop: '2px',
    fontWeight: '600',
  },
  remarksTextarea: {
    minHeight: '100px',
    resize: 'vertical',
  },
  workflowRight: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryBox: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    textAlign: 'left',
  },
  summaryDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    background: '#f8fafc',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-recessed-light)',
    marginBottom: '24px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
  },
  summaryLabel: {
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  summaryValue: {
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  summaryValueTotal: {
    color: 'var(--primary)',
    fontWeight: '700',
  },
  actionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionButton: {
    width: '100%',
  }
};
