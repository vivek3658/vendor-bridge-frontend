import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function PurchaseOrdersPage({ isInvoiceView = false }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active detailed view for a single PO/Invoice
  const [selectedPO, setSelectedPO] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load user profile
  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch Purchase Orders from backend
  const fetchPOs = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch purchase orders.');
      }
      setPOs(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
    setSelectedPO(null); // Reset detail view when route changes
  }, [isInvoiceView, location.pathname]);

  // Mark PO as paid (Admin/Officer/Manager only)
  const handleMarkAsPaid = async (poId) => {
    setError('');
    setSuccess('');
    setActionLoading(true);
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos/${poId}/pay`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update payment status.');
      }

      setSuccess('Purchase Order & Invoice marked as Paid!');
      // Update local state
      setPOs(prev => prev.map(item => item._id === poId ? { ...item, status: 'Paid' } : item));
      if (selectedPO && selectedPO._id === poId) {
        setSelectedPO(prev => ({ ...prev, status: 'Paid' }));
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Mock actions
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleEmailInvoice = async () => {
    if (!selectedPO) return;
    setError('');
    setSuccess('');
    setActionLoading(true);
    const token = localStorage.getItem('vb_token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/pos/${selectedPO._id}/email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to email invoice.');
      }

      setSuccess(result.message || 'Invoice details successfully emailed to vendor.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container" style={styles.pageContainer}>
      <Sidebar />

      <div className="main-content" style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        {!selectedPO ? (
          /* LIST VIEW */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>{isInvoiceView ? 'Invoices' : 'Purchase Orders'}</h1>
                <p style={styles.subtitle}>
                  {isInvoiceView 
                    ? 'Track billing invoices, tax breakdowns, and payment settlements'
                    : 'Track official purchase order generation and fulfillment status'}
                </p>
              </div>
            </div>

            <div className="glass-panel animate-fade-in" style={styles.tableCard}>
              {loading ? (
                <div style={styles.tablePlaceholder}>Loading {isInvoiceView ? 'invoices' : 'purchase orders'}...</div>
              ) : pos.length === 0 ? (
                <div style={styles.tablePlaceholder}>No {isInvoiceView ? 'invoices' : 'purchase orders'} found.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>{isInvoiceView ? 'Invoice No' : 'PO Number'}</th>
                      <th style={styles.th}>RFQ Reference</th>
                      {user?.role !== 'Vendor' && <th style={styles.th}>Vendor</th>}
                      <th style={styles.th}>Grand Total</th>
                      {isInvoiceView && <th style={styles.th}>GST Split</th>}
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((po) => {
                      const invNumber = `INV-${po.poNumber.substring(3)}`;
                      return (
                        <tr key={po._id} style={styles.trRow}>
                          <td style={styles.td}>
                            <strong>{isInvoiceView ? invNumber : po.poNumber}</strong>
                          </td>
                          <td style={styles.td}>{po.rfqId?.title || 'N/A'}</td>
                          {user?.role !== 'Vendor' && (
                            <td style={styles.td}>@{po.vendorId?.username || 'N/A'}</td>
                          )}
                          <td style={styles.td}>₹{(po.grandTotal || 0).toLocaleString()}</td>
                          {isInvoiceView && (
                            <td style={styles.td}>
                                C: ₹{(po.cgstAmount || 0).toLocaleString()} | S: ₹{(po.sgstAmount || 0).toLocaleString()}
                            </td>
                          )}
                          <td style={styles.td}>
                            {new Date(po.poDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: po.status === 'Paid' ? '#d1fae5' : '#fffbeb',
                                color: po.status === 'Paid' ? '#065f46' : '#b45309',
                                borderColor: po.status === 'Paid' ? '#a7f3d0' : '#fde68a',
                              }}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => setSelectedPO(po)}
                              className="btn btn-secondary"
                              style={styles.actionBtn}
                            >
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          /* DETAILED DOCUMENT VIEW - SCREEN 9 */
          <>
            <div className="no-print" style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Purchase Order & Invoice</h1>
                <p style={styles.subtitle}>
                  PO-2024-auto-generated after approval
                </p>
              </div>
              <div style={styles.headerActions}>
                <button onClick={handleDownloadPDF} className="btn btn-secondary" style={styles.utilityBtn} disabled={actionLoading}>
                  Download PDF
                </button>
                <button onClick={handlePrint} className="btn btn-secondary" style={styles.utilityBtn} disabled={actionLoading}>
                  Print
                </button>
                <button onClick={handleEmailInvoice} className="btn btn-secondary" style={styles.utilityBtn} disabled={actionLoading}>
                  {actionLoading ? 'Emailing...' : 'Email Invoice'}
                </button>
                <button onClick={() => setSelectedPO(null)} className="btn btn-primary" style={styles.backBtn} disabled={actionLoading}>
                  Back to List
                </button>
              </div>
            </div>

            {/* Combined Invoice & PO Skeuomorphic Card */}
            <div className="glass-panel animate-fade-in invoice-card" style={styles.invoiceCard}>
              {/* Billing Info Grid */}
              <div style={styles.billingGrid}>
                {/* Bill To */}
                <div style={styles.billingCol}>
                  <h4 style={styles.billingTitle}>Bill to:</h4>
                  <p style={styles.billingText}><strong>{selectedPO.billTo.companyName}</strong></p>
                  <p style={styles.billingText}>{selectedPO.billTo.address}</p>
                  {selectedPO.billTo.gstin && (
                    <p style={styles.billingText}><strong>GSTIN:</strong> {selectedPO.billTo.gstin}</p>
                  )}
                </div>

                {/* Vendor */}
                <div style={styles.billingCol}>
                  <h4 style={styles.billingTitle}>Vendor</h4>
                  <p style={styles.billingText}><strong>{selectedPO.vendorBilling.companyName}</strong></p>
                  <p style={styles.billingText}>{selectedPO.vendorBilling.address}</p>
                  <p style={styles.billingText}><strong>GSTIN:</strong> {selectedPO.vendorBilling.gstNumber}</p>
                </div>
              </div>

              {/* Meta Info Grid */}
              <div style={styles.metaInfoGrid}>
                <div style={styles.metaRow}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>PO Number:</span>
                    <span style={styles.metaVal}>{selectedPO.poNumber}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Invoice date:</span>
                    <span style={styles.metaVal}>
                      {new Date(selectedPO.invoiceDate || selectedPO.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={styles.metaRow}>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>PO date:</span>
                    <span style={styles.metaVal}>
                      {new Date(selectedPO.poDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={styles.metaItem}>
                    <span style={styles.metaLabel}>Invoice number:</span>
                    <span style={styles.metaVal}>INV-{selectedPO.poNumber.substring(3)}</span>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.invoiceTh}>Item</th>
                      <th style={{ ...styles.invoiceTh, textAlign: 'center' }}>Qty</th>
                      <th style={{ ...styles.invoiceTh, textAlign: 'right' }}>Unit price</th>
                      <th style={{ ...styles.invoiceTh, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items.map((item, index) => (
                      <tr key={index} style={styles.trRow}>
                        <td style={styles.invoiceTd}><strong>{item.item}</strong></td>
                        <td style={{ ...styles.invoiceTd, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ ...styles.invoiceTd, textAlign: 'right' }}>₹{(item.unitPrice || 0).toLocaleString()}</td>
                        <td style={{ ...styles.invoiceTd, textAlign: 'right' }}>₹{(item.itemTotal || item.quantity * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                    
                    {/* Math Totals */}
                    <tr style={styles.invoiceMathRow}>
                      <td colSpan="2" style={{ border: 'none' }}></td>
                      <td style={styles.invoiceMathLabel}>Subtotal</td>
                      <td style={styles.invoiceMathVal}>₹{selectedPO.subtotal.toLocaleString()}</td>
                    </tr>
                    <tr style={styles.invoiceMathRow}>
                      <td colSpan="2" style={{ border: 'none' }}></td>
                      <td style={styles.invoiceMathLabel}>CGST({selectedPO.cgstRate}%)</td>
                      <td style={styles.invoiceMathVal}>₹{selectedPO.cgstAmount.toLocaleString()}</td>
                    </tr>
                    <tr style={styles.invoiceMathRow}>
                      <td colSpan="2" style={{ border: 'none' }}></td>
                      <td style={styles.invoiceMathLabel}>SGST({selectedPO.sgstRate}%)</td>
                      <td style={styles.invoiceMathVal}>₹{selectedPO.sgstAmount.toLocaleString()}</td>
                    </tr>
                    {selectedPO.shippingCost > 0 && (
                      <tr style={styles.invoiceMathRow}>
                        <td colSpan="2" style={{ border: 'none' }}></td>
                        <td style={styles.invoiceMathLabel}>Shipping Cost</td>
                        <td style={styles.invoiceMathVal}>₹{selectedPO.shippingCost.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr style={styles.invoiceTotalRow}>
                      <td colSpan="2" style={{ border: 'none' }}></td>
                      <td style={styles.invoiceTotalLabel}>Grand total</td>
                      <td style={styles.invoiceTotalVal}>₹{selectedPO.grandTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status and Pay Control */}
              <div style={styles.invoiceFooter}>
                <div style={styles.statusGroup}>
                  <span style={styles.statusFooterLabel}>status:</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: selectedPO.status === 'Paid' ? '#d1fae5' : '#fffbeb',
                      color: selectedPO.status === 'Paid' ? '#065f46' : '#b45309',
                      borderColor: selectedPO.status === 'Paid' ? '#a7f3d0' : '#fde68a',
                      fontSize: '0.95rem',
                      padding: '6px 14px',
                    }}
                  >
                    {selectedPO.status}
                  </span>
                </div>

                {selectedPO.status !== 'Paid' && user?.role !== 'Vendor' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedPO._id)}
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={styles.payBtn}
                  >
                    {actionLoading ? 'Processing...' : 'Mark as Paid'}
                  </button>
                )}
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    border: '1px solid',
  },
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem',
    borderRadius: '4px',
  },
  utilityBtn: {
    padding: '10px 18px',
    fontSize: '0.9rem',
    borderRadius: '6px',
    borderColor: '#d1d9e6',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  backBtn: {
    padding: '10px 18px',
    fontSize: '0.9rem',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  invoiceCard: {
    padding: '36px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: 'var(--shadow-raised)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    borderRadius: '8px',
  },
  billingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '24px',
  },
  billingCol: {
    textAlign: 'left',
  },
  billingTitle: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  billingText: {
    margin: '0 0 6px 0',
    fontSize: '0.98rem',
    color: 'var(--text-main)',
    lineHeight: '1.4',
  },
  metaInfoGrid: {
    backgroundColor: '#f8fafc',
    padding: '20px 24px',
    borderRadius: '6px',
    border: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-recessed-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
  },
  metaItem: {
    display: 'flex',
    gap: '8px',
  },
  metaLabel: {
    color: 'var(--text-muted)',
    fontWeight: '500',
    fontSize: '0.92rem',
  },
  metaVal: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: '0.92rem',
  },
  tableWrapper: {
    marginTop: '10px',
  },
  invoiceTh: {
    padding: '12px 16px',
    fontSize: '0.88rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    borderBottom: '2px solid var(--border-light)',
  },
  invoiceTd: {
    padding: '16px',
    fontSize: '0.98rem',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--border-light)',
    textAlign: 'left',
  },
  invoiceMathRow: {
    border: 'none',
  },
  invoiceMathLabel: {
    padding: '10px 16px',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textAlign: 'right',
    border: 'none',
  },
  invoiceMathVal: {
    padding: '10px 16px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    textAlign: 'right',
    border: 'none',
  },
  invoiceTotalRow: {
    borderTop: '2px solid var(--border-light)',
  },
  invoiceTotalLabel: {
    padding: '16px',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    textAlign: 'right',
    border: 'none',
  },
  invoiceTotalVal: {
    padding: '16px',
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--primary)',
    textAlign: 'right',
    border: 'none',
  },
  invoiceFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '24px',
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusFooterLabel: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  payBtn: {
    padding: '10px 24px',
    fontSize: '0.95rem',
    borderRadius: '6px',
    boxShadow: 'var(--shadow-raised)',
  }
};
