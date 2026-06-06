import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [rfqsToQuote, setRfqsToQuote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Page views: list, create form, or compare matrix
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparingRfq, setComparingRfq] = useState(null);
  const [comparisonQuotes, setComparisonQuotes] = useState([]);

  // Form states
  const [items, setItems] = useState([]); // [{ item, quantity, unit, unitPrice, deliveryDays }]
  const [taxRate, setTaxRate] = useState(18);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');

  // Detail Modal state
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Load User session
  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch Quotations list
  const fetchQuotations = async () => {
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
      setQuotations(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch RFQs to see which ones are available for the vendor to quote on
  const fetchRfqsToQuote = async () => {
    const token = localStorage.getItem('vb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/rfqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (response.ok && result.data) {
        // For Vendors, show Published RFQs they haven't quoted on yet
        // For Admin/Officer, we can just load them to let them see all RFQs
        setRfqsToQuote(result.data.filter(rfq => rfq.status === 'Published') || []);
      }
    } catch (err) {
      console.error('Error loading RFQs to quote', err);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchRfqsToQuote();
  }, []);

  // Open creation form for a specific RFQ
  const handleOpenQuoteForm = (rfq) => {
    setSelectedRfq(rfq);
    
    // Map RFQ items to form items, adding unitPrice (0) and deliveryDays (7)
    const formItems = rfq.items.map((it) => ({
      item: it.item,
      quantity: it.quantity || 1,
      unit: it.unit || 'pcs',
      unitPrice: 0,
      deliveryDays: 7
    }));

    setItems(formItems);
    setTaxRate(18);
    setShippingCost(0);
    setNotes('');
    setIsCreating(true);
  };

  // Open Comparison Matrix for a specific RFQ
  const handleOpenComparison = async (rfq) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setComparingRfq(rfq);
    
    const token = localStorage.getItem('vb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotations/compare/${rfq._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load quotations comparison.');
      }
      setComparisonQuotes(result.data || []);
      setIsComparing(true);
    } catch (err) {
      setError(err.message);
      setComparingRfq(null);
    } finally {
      setLoading(false);
    }
  };

  // Row price changes
  const handlePriceChange = (index, value) => {
    const newItems = [...items];
    newItems[index].unitPrice = parseFloat(value) || 0;
    setItems(newItems);
  };

  // Row delivery changes
  const handleDeliveryChange = (index, value) => {
    const newItems = [...items];
    newItems[index].deliveryDays = parseInt(value) || 1;
    setItems(newItems);
  };

  // Auto Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount + parseFloat(shippingCost || 0);

  // Submit Bid Quotation
  const handleSubmitQuotation = async () => {
    setError('');
    setSuccess('');

    // Validations
    const invalidItem = items.find(i => i.unitPrice <= 0);
    if (invalidItem) {
      setError(`Please provide a unit price greater than 0 for "${invalidItem.item}".`);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('vb_token');

    try {
      const payload = {
        rfqId: selectedRfq._id,
        items: items.map(i => ({
          item: i.item,
          unitPrice: Number(i.unitPrice),
          deliveryDays: Number(i.deliveryDays)
        })),
        taxRate: Number(taxRate),
        shippingCost: Number(shippingCost),
        notes: notes
      };

      const response = await fetch(`${API_BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit quotation.');
      }

      setSuccess('Quotation submitted successfully!');
      setIsCreating(false);
      
      fetchQuotations(); // reload list
      fetchRfqsToQuote(); // update available RFQs list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mock Save Draft (saves to localStorage)
  const handleSaveDraft = () => {
    const draftKey = `draft_quote_${selectedRfq._id}`;
    const draftData = {
      items,
      taxRate,
      shippingCost,
      notes
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setSuccess('Quotation draft saved locally successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const cheapestQuote = isComparing && comparisonQuotes.length > 0
    ? comparisonQuotes.reduce((min, q) => ((q.totalAmount || 0) < (min.totalAmount || 0) ? q : min), comparisonQuotes[0])
    : null;

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        {isCreating ? (
          /* SUBMIT QUOTATION FORM VIEW - SCREEN 6 */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Submit Quotations</h1>
                <p style={styles.subtitle}>
                  RFQ: {selectedRfq?.title} - deadline {selectedRfq && new Date(selectedRfq.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setIsCreating(false)} className="btn btn-secondary">
                Back to List
              </button>
            </div>

            {/* RFQ Summary panel */}
            <div className="glass-panel" style={styles.summaryCard}>
              <div style={styles.summaryTitle}>RFQ Summary</div>
              <div style={styles.summaryContent}>
                {selectedRfq?.items?.map((it, idx) => (
                  <span key={idx} style={styles.summaryItemText}>
                    {it.item} * {it.quantity} {it.unit || 'pcs'}
                    {idx < selectedRfq.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
                <span style={styles.summaryCategory}> - category {selectedRfq?.category || 'General'}</span>
              </div>
            </div>

            {/* Quotation Bid Grid */}
            <div className="glass-panel" style={styles.formColCard}>
              <h3 style={styles.cardHeader}>Your Quotation</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Unit price</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>delivery (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, index) => (
                    <tr key={index} style={styles.trRow}>
                      <td style={styles.td}>{it.item}</td>
                      <td style={styles.td}>{it.quantity}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ ...styles.tableInput, width: '120px' }}
                          placeholder="3500"
                          value={it.unitPrice || ''}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          min="0.01"
                          required
                        />
                      </td>
                      <td style={styles.td}>₹{(it.quantity * it.unitPrice).toLocaleString()}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ ...styles.tableInput, width: '90px' }}
                          placeholder="7"
                          value={it.deliveryDays || ''}
                          onChange={(e) => handleDeliveryChange(index, e.target.value)}
                          min="1"
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations and Note Grid */}
            <div style={styles.calcGrid}>
              {/* Left Form: Tax & Notes */}
              <div style={styles.calcLeft}>
                <div className="form-group">
                  <label className="form-label">tax / GST %</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="18"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">shipping cost (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Note / terms</label>
                  <textarea
                    className="form-input"
                    placeholder="Payment terms: 20 days net..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={styles.notesTextarea}
                  />
                </div>
              </div>

              {/* Right Form: Totals Calculation Card */}
              <div className="glass-panel" style={styles.calcRight}>
                <div style={styles.calcRow}>
                  <span style={styles.calcLabel}>Subtotal</span>
                  <span style={styles.calcValue}>₹{subtotal.toLocaleString()}</span>
                </div>
                <div style={styles.calcRow}>
                  <span style={styles.calcLabel}>Tax / GST ({taxRate}%)</span>
                  <span style={styles.calcValue}>₹{taxAmount.toLocaleString()}</span>
                </div>
                {shippingCost > 0 && (
                  <div style={styles.calcRow}>
                    <span style={styles.calcLabel}>Shipping Cost</span>
                    <span style={styles.calcValue}>₹{shippingCost.toLocaleString()}</span>
                  </div>
                )}
                <div style={styles.calcSeparator} />
                <div style={styles.calcRowTotal}>
                  <span style={styles.calcLabelTotal}>Grand total</span>
                  <span style={styles.calcValueTotal}>₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div style={styles.footerRow}>
              <button
                onClick={handleSubmitQuotation}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Quotation'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn btn-secondary"
                disabled={loading}
              >
                Save Draft
              </button>
            </div>
          </>
        ) : isComparing ? (
          /* COMPARISON MATRIX VIEW */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Bid Comparison Matrix</h1>
                <p style={styles.subtitle}>
                  RFQ: {comparingRfq?.title} - Category: {comparingRfq?.category || 'General'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsComparing(false);
                  setComparingRfq(null);
                  setComparisonQuotes([]);
                }} 
                className="btn btn-secondary"
              >
                Back to List
              </button>
            </div>

            {comparisonQuotes.length === 0 ? (
              <div className="glass-panel" style={styles.noDataCard}>
                No quotations submitted for this RFQ yet.
              </div>
            ) : (
              <div className="glass-panel animate-fade-in" style={styles.matrixCard}>
                <div style={styles.matrixContainer}>
                  <table style={styles.matrixTable}>
                    <thead>
                      <tr>
                        <th style={styles.matrixThHeader}>Criteria</th>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <th 
                              key={bid._id} 
                              style={{
                                ...styles.matrixTh,
                                ...(isCheapest ? styles.matrixCheapestHeader : {})
                              }}
                            >
                              <div style={styles.matrixVendorName}>
                                @{bid.vendor?.username || 'N/A'}
                              </div>
                              <div style={styles.matrixVendorCompany}>
                                {bid.vendor?.companyName || 'N/A'}
                              </div>
                              {isCheapest && <span style={styles.bestValueBadge}>Best Value</span>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Grand Total Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}><strong>Grand Total</strong></td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              <span style={styles.matrixValueTotal}>
                                ₹{(bid.totalAmount || 0).toLocaleString()}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      {/* GST Rate Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>GST Tax Rate</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              {bid.taxRate !== undefined ? `${bid.taxRate}%` : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Delivery Days Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>Delivery Timeline</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              {bid.overallDeliveryDays} days
                            </td>
                          );
                        })}
                      </tr>

                      {/* Vendor Rating Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>Vendor Rating</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              <div style={styles.ratingStars}>
                                ⭐ {bid.vendor?.rating || 0}/5
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Score Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>Weighted Score</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              <strong style={styles.matrixScoreText}>
                                {bid.scores?.totalScore || 0} / 100
                              </strong>
                              <div style={styles.scoreBreakdown}>
                                P: {bid.scores?.priceScore || 0} | R: {bid.scores?.ratingScore || 0} | D: {bid.scores?.deliveryScore || 0} | T: {bid.scores?.paymentScore || 0}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Payment Terms Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>Notes & Terms</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {}),
                                fontSize: '0.82rem',
                                color: 'var(--text-muted)',
                                wordBreak: 'break-word'
                              }}
                            >
                              {bid.paymentTerms || bid.notes || 'None specified'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Action Row */}
                      <tr style={styles.matrixRow}>
                        <td style={styles.matrixCriteriaCell}>Actions</td>
                        {comparisonQuotes.map((bid) => {
                          const isCheapest = cheapestQuote && bid._id === cheapestQuote._id;
                          return (
                            <td 
                              key={bid._id} 
                              style={{
                                ...styles.matrixValueCell,
                                ...(isCheapest ? styles.matrixCheapestCell : {})
                              }}
                            >
                              {(user?.role === 'Manager' || user?.role === 'Admin') ? (
                                <button
                                  onClick={() => navigate(`/approvals?quoteId=${bid._id}`)}
                                  className="btn btn-primary"
                                  style={{
                                    ...styles.matrixActionBtn,
                                    ...(isCheapest ? styles.matrixCheapestBtn : {})
                                  }}
                                >
                                  Select & Approve
                                </button>
                              ) : (
                                <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600'}}>
                                  Awaiting Manager Approval
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* LIST VIEWS */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Quotations</h1>
                <p style={styles.subtitle}>Vendor bids, prices, and quotation statuses</p>
              </div>
            </div>

            {/* VENDORS SECTION: ASSIGNED RFQS PENDING BIDS */}
            {user?.role === 'Vendor' && (
              <div style={styles.sectionWrapper}>
                <h3 style={styles.sectionHeader}>Assigned RFQs Pending Bids</h3>
                {rfqsToQuote.length === 0 ? (
                  <div className="glass-panel" style={styles.noDataCard}>
                    No pending RFQ invitations found.
                  </div>
                ) : (
                  <div style={styles.rfqQuoteGrid}>
                    {rfqsToQuote.map((rfq) => {
                      const alreadyQuoted = quotations.some(q => q.rfqId?._id === rfq._id);
                      if (alreadyQuoted) return null; // hide already bid RFQs
                      
                      return (
                        <div key={rfq._id} className="glass-panel animate-fade-in" style={styles.rfqCard}>
                          <h4 style={styles.rfqCardTitle}>{rfq.title}</h4>
                          <span style={styles.rfqCardCategory}>{rfq.category || 'General'}</span>
                          <p style={styles.rfqCardDesc}>{rfq.description?.substring(0, 100)}...</p>
                          <div style={styles.rfqCardMeta}>
                            <span>Deadline: {new Date(rfq.deadline).toLocaleDateString()}</span>
                            <span>{rfq.items?.length || 0} items requested</span>
                          </div>
                          <button
                            onClick={() => handleOpenQuoteForm(rfq)}
                            className="btn btn-primary"
                            style={styles.quoteBtn}
                          >
                            Quote Now
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* NON-VENDORS SECTION: ACTIVE RFQS FOR COMPARISON */}
            {user?.role !== 'Vendor' && (
              <div style={styles.sectionWrapper}>
                <h3 style={styles.sectionHeader}>Active RFQs (Bid Comparison)</h3>
                {rfqsToQuote.length === 0 ? (
                  <div className="glass-panel" style={styles.noDataCard}>
                    No active published RFQs found.
                  </div>
                ) : (
                  <div style={styles.rfqQuoteGrid}>
                    {rfqsToQuote.map((rfq) => (
                      <div key={rfq._id} className="glass-panel animate-fade-in" style={styles.rfqCard}>
                        <h4 style={styles.rfqCardTitle}>{rfq.title}</h4>
                        <span style={styles.rfqCardCategory}>{rfq.category || 'General'}</span>
                        <p style={styles.rfqCardDesc}>{rfq.description?.substring(0, 100)}...</p>
                        <div style={styles.rfqCardMeta}>
                          <span>Deadline: {new Date(rfq.deadline).toLocaleDateString()}</span>
                          <span>{rfq.items?.length || 0} items requested</span>
                        </div>
                        <button
                          onClick={() => handleOpenComparison(rfq)}
                          className="btn btn-primary"
                          style={styles.quoteBtn}
                        >
                          Compare Bids
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBMITTED BIDS LIST */}
            <div style={styles.sectionWrapper}>
              <h3 style={styles.sectionHeader}>Submitted Quotations</h3>
              <div className="glass-panel animate-fade-in" style={styles.tableCard}>
                {loading ? (
                  <div style={styles.tablePlaceholder}>Loading quotations data...</div>
                ) : quotations.length === 0 ? (
                  <div style={styles.tablePlaceholder}>No bids submitted yet.</div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th style={styles.th}>Quotation ID</th>
                        <th style={styles.th}>RFQ Title</th>
                        {user?.role !== 'Vendor' && <th style={styles.th}>Vendor</th>}
                        <th style={styles.th}>Total Amount</th>
                        <th style={styles.th}>GST Tax</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((quote) => (
                        <tr key={quote._id} style={styles.trRow}>
                          <td style={styles.td}><strong>{quote.quotationNumber}</strong></td>
                          <td style={styles.td}>{quote.rfqId?.title || 'N/A'}</td>
                          {user?.role !== 'Vendor' && (
                            <td style={styles.td}>@{quote.vendorId?.username || 'N/A'}</td>
                          )}
                          <td style={styles.td}>₹{(quote.totalAmount || 0).toLocaleString()}</td>
                          <td style={styles.td}>₹{(quote.taxAmount || 0).toLocaleString()} ({quote.taxRate}%)</td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor:
                                  quote.status === 'Approved' ? '#d1fae5' :
                                  quote.status === 'Rejected' ? '#fee2e2' : '#f1f5f9',
                                color:
                                  quote.status === 'Approved' ? '#065f46' :
                                  quote.status === 'Rejected' ? '#991b1b' : '#475569',
                                borderColor:
                                  quote.status === 'Approved' ? '#a7f3d0' :
                                  quote.status === 'Rejected' ? '#fca5a5' : '#cbd5e1',
                              }}
                            >
                              {quote.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => setSelectedQuotation(quote)}
                              className="btn btn-secondary"
                              style={styles.actionBtn}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedQuotation && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel animate-fade-in" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Quotation Details</h2>
              <button onClick={() => setSelectedQuotation(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Quotation No:</span>
                <span style={styles.detailValue}>{selectedQuotation.quotationNumber}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Referenced RFQ:</span>
                <span style={styles.detailValue}>{selectedQuotation.rfqId?.title || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Submitted By:</span>
                <span style={styles.detailValue}>@{selectedQuotation.vendorId?.username || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Subtotal:</span>
                <span style={styles.detailValue}>₹{(selectedQuotation.subtotal || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>GST Tax ({selectedQuotation.taxRate}%):</span>
                <span style={styles.detailValue}>₹{(selectedQuotation.taxAmount || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Shipping Charges:</span>
                <span style={styles.detailValue}>₹{(selectedQuotation.shippingCost || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Grand Total:</span>
                <span style={styles.detailValue}>₹{(selectedQuotation.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Status:</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      selectedQuotation.status === 'Approved' ? '#d1fae5' :
                      selectedQuotation.status === 'Rejected' ? '#fee2e2' : '#f1f5f9',
                    color:
                      selectedQuotation.status === 'Approved' ? '#065f46' :
                      selectedQuotation.status === 'Rejected' ? '#991b1b' : '#475569',
                    borderColor:
                      selectedQuotation.status === 'Approved' ? '#a7f3d0' :
                      selectedQuotation.status === 'Rejected' ? '#fca5a5' : '#cbd5e1',
                  }}
                >
                  {selectedQuotation.status}
                </span>
              </div>
              {selectedQuotation.notes && (
                <div style={styles.detailItemBlock}>
                  <span style={styles.detailLabel}>Notes / Terms:</span>
                  <div style={styles.detailBlockValue}>{selectedQuotation.notes}</div>
                </div>
              )}

              {/* Items Bid List */}
              <div style={styles.detailItemBlock}>
                <span style={styles.detailLabel}>Proposed Bids:</span>
                <table style={{ ...styles.table, marginTop: '8px' }}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Item</th>
                      <th style={styles.th}>Unit Price</th>
                      <th style={styles.th}>Delivery (Days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotation.items?.map((it, idx) => (
                      <tr key={idx} style={styles.trRow}>
                        <td style={styles.td}>{it.item}</td>
                        <td style={styles.td}>₹{(it.unitPrice || 0).toLocaleString()}</td>
                        <td style={styles.td}>{it.deliveryDays} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setSelectedQuotation(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  sectionWrapper: {
    marginBottom: '32px',
    textAlign: 'left',
  },
  sectionHeader: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.35rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    marginBottom: '16px',
  },
  noDataCard: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--text-dim)',
  },
  rfqQuoteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  rfqCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  rfqCardTitle: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    margin: '0 0 6px 0',
  },
  rfqCardCategory: {
    fontSize: '0.75rem',
    background: 'rgba(79, 70, 229, 0.1)',
    color: 'var(--primary)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  rfqCardDesc: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    lineHeight: '1.4',
    marginBottom: '16px',
    flex: 1,
  },
  rfqCardMeta: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '10px',
    marginBottom: '16px',
  },
  quoteBtn: {
    width: '100%',
    padding: '8px 16px',
    fontSize: '0.9rem',
  },
  tableCard: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: 'var(--shadow-raised)',
  },
  tablePlaceholder: {
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
  /* Form views summary card */
  summaryCard: {
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    marginBottom: '28px',
    textAlign: 'left',
  },
  summaryTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  summaryContent: {
    fontSize: '1.05rem',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  summaryItemText: {
    color: 'var(--primary)',
  },
  summaryCategory: {
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  formColCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    marginBottom: '28px',
    textAlign: 'left',
  },
  cardHeader: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '8px',
  },
  tableInput: {
    padding: '8px 12px',
    fontSize: '0.9rem',
  },
  calcGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    marginBottom: '30px',
  },
  calcLeft: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  notesTextarea: {
    minHeight: '100px',
    resize: 'vertical',
  },
  calcRight: {
    padding: '30px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'left',
  },
  calcRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    marginBottom: '12px',
    color: 'var(--text-muted)',
  },
  calcLabel: {
    fontWeight: '500',
  },
  calcValue: {
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  calcSeparator: {
    height: '1px',
    backgroundColor: 'var(--border-light)',
    margin: '12px 0 16px 0',
  },
  calcRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1.2rem',
    color: 'var(--text-main)',
  },
  calcLabelTotal: {
    fontWeight: '700',
  },
  calcValueTotal: {
    fontWeight: '700',
    color: 'var(--primary)',
  },
  footerRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-start',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '20px',
  },
  /* Modal styling */
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: '650px',
    padding: '30px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    boxShadow: '24px 24px 48px #cbd5e1, -24px -24px 48px #ffffff',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '15px',
    marginBottom: '20px',
  },
  modalTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    background: '#f8fafc',
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-recessed-light)',
    marginBottom: '20px',
    textAlign: 'left',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.95rem',
  },
  detailItemBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.95rem',
    textAlign: 'left',
  },
  detailLabel: {
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  detailValue: {
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  detailBlockValue: {
    color: 'var(--text-main)',
    background: '#ffffff',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #d1d9e6',
    boxShadow: 'var(--shadow-recessed-light)',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  matrixCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    textAlign: 'left',
    marginBottom: '28px',
  },
  matrixContainer: {
    overflowX: 'auto',
    width: '100%',
  },
  matrixTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'center',
  },
  matrixThHeader: {
    width: '200px',
    padding: '16px 20px',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    borderBottom: '2px solid var(--border-light)',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
  },
  matrixTh: {
    padding: '16px 20px',
    fontSize: '0.95rem',
    borderBottom: '2px solid var(--border-light)',
    backgroundColor: '#f8fafc',
    position: 'relative',
    transition: 'all 0.2s',
  },
  matrixCheapestHeader: {
    backgroundColor: '#e8f5e9',
    borderBottom: '2.5px solid #2e7d32',
    color: '#1b5e20',
  },
  matrixVendorName: {
    fontWeight: '700',
    color: 'var(--text-main)',
    fontSize: '1.05rem',
  },
  matrixVendorCompany: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  bestValueBadge: {
    position: 'absolute',
    top: '-10px',
    right: '10px',
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  matrixRow: {
    borderBottom: '1px solid var(--border-light)',
  },
  matrixCriteriaCell: {
    padding: '16px 20px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid var(--border-light)',
  },
  matrixValueCell: {
    padding: '16px 20px',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    transition: 'all 0.2s',
  },
  matrixCheapestCell: {
    backgroundColor: '#f1fbf3',
    color: '#1b5e20',
    fontWeight: '500',
    boxShadow: 'inset 0 0 10px rgba(46, 125, 50, 0.05)',
  },
  matrixValueTotal: {
    fontSize: '1.1rem',
    fontWeight: '700',
  },
  ratingStars: {
    fontWeight: '600',
  },
  matrixScoreText: {
    fontSize: '1.05rem',
    color: 'var(--primary)',
  },
  scoreBreakdown: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  matrixActionBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
  },
  matrixCheapestBtn: {
    backgroundColor: '#2e7d32',
    borderColor: '#1b5e20',
  }
};
