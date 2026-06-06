import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function RfqsPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Page views: list or create form
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ item: '', quantity: 1, unit: 'NOS' }]);
  const [assignedVendors, setAssignedVendors] = useState([]); // Array of vendor usernames
  const [attachments, setAttachments] = useState([]); // Array of File objects
  
  // Available vendors loaded from backend for assignment dropdown
  const [availableVendors, setAvailableVendors] = useState([]);
  const [selectedVendorUsername, setSelectedVendorUsername] = useState('');
  
  // View detail modal
  const [selectedRfq, setSelectedRfq] = useState(null);

  // Fetch RFQs
  const fetchRfqs = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('vb_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/rfqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch RFQs.');
      }
      // Live backend data
      setRfqs(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Vendors list for selector
  const fetchAvailableVendors = async () => {
    const token = localStorage.getItem('vb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setAvailableVendors(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching vendors for RFQ assign', err);
    }
  };

  useEffect(() => {
    fetchRfqs();
    fetchAvailableVendors();
  }, []);

  // Line Items Handlers
  const handleAddItemRow = () => {
    setItems([...items, { item: '', quantity: 1, unit: 'NOS' }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // Vendor Assignment Handlers
  const handleAddVendor = () => {
    if (!selectedVendorUsername) return;
    if (assignedVendors.includes(selectedVendorUsername)) {
      setSelectedVendorUsername('');
      return;
    }
    setAssignedVendors([...assignedVendors, selectedVendorUsername]);
    setSelectedVendorUsername('');
  };

  const handleRemoveVendor = (username) => {
    setAssignedVendors(assignedVendors.filter(v => v !== username));
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Submit Form (Draft or Published)
  const handleSubmitRfq = async (statusValue) => {
    setError('');
    setSuccess('');
    
    if (!title || !deadline) {
      setError('Title and Deadline are required.');
      return;
    }

    // Validate future deadline
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      setError('Deadline must be a future date.');
      return;
    }

    // Validate line items
    const validItems = items.filter(i => i.item.trim() !== '');
    if (validItems.length === 0) {
      setError('Please provide at least one valid line item.');
      return;
    }

    setLoading(true);

    const token = localStorage.getItem('vb_token');
    
    try {
      // Build multipart/form-data payload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('deadline', deadlineDate.toISOString());
      formData.append('description', description);
      formData.append('items', JSON.stringify(validItems));
      formData.append('assignedVendors', JSON.stringify(assignedVendors));
      formData.append('status', statusValue); // Draft or Published

      // Append files
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/rfqs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Let the browser set Content-Type automatically for boundary
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create RFQ.');
      }

      setSuccess(`RFQ successfully ${statusValue === 'Published' ? 'created and published' : 'saved as draft'}!`);
      
      // Reset form fields
      setTitle('');
      setCategory('');
      setDeadline('');
      setDescription('');
      setItems([{ item: '', quantity: 1, unit: 'NOS' }]);
      setAssignedVendors([]);
      setAttachments([]);
      
      setIsCreating(false);
      fetchRfqs(); // reload list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDeadline = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        {!isCreating ? (
          /* LIST VIEW */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Request for Quotations (RFQs)</h1>
                <p style={styles.subtitle}>Procurement officers' requirements and invited vendors list</p>
              </div>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary">
                + Create RFQ
              </button>
            </div>

            <div className="glass-panel animate-fade-in" style={styles.tableCard}>
              {loading ? (
                <div style={styles.tablePlaceholder}>Loading RFQs...</div>
              ) : rfqs.length === 0 ? (
                <div style={styles.tablePlaceholder}>No RFQs found. Start by creating one!</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>RFQ Title</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Deadline</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Items</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.map((rfq) => (
                      <tr key={rfq._id} style={styles.trRow}>
                        <td style={styles.td}>
                          <span style={styles.rfqTitleText}>{rfq.title}</span>
                          <span style={styles.rfqDescText}>{rfq.description?.substring(0, 50)}...</span>
                        </td>
                        <td style={styles.td}>{rfq.category || 'N/A'}</td>
                        <td style={styles.td}>{formatDeadline(rfq.deadline)}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              backgroundColor: rfq.status === 'Published' ? '#d1fae5' : '#f1f5f9',
                              color: rfq.status === 'Published' ? '#065f46' : '#475569',
                              borderColor: rfq.status === 'Published' ? '#a7f3d0' : '#cbd5e1',
                            }}
                          >
                            {rfq.status}
                          </span>
                        </td>
                        <td style={styles.td}>{rfq.items?.length || 0} line items</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => setSelectedRfq(rfq)}
                            className="btn btn-secondary"
                            style={styles.actionBtn}
                          >
                            View
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
          /* FORM VIEW - SCREEN 5 */
          <>
            <div style={styles.headerRow}>
              <div>
                <h1 style={styles.title}>Create RFQ's</h1>
                <p style={styles.subtitle}>new request for quotation</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="btn btn-secondary">
                Back to List
              </button>
            </div>

            {/* Steps Progress Bar */}
            <div style={styles.stepsContainer}>
              <div style={styles.stepCircleActive}>1</div>
              <div style={styles.stepConnectorActive} />
              <div style={styles.stepCircleActive}>2</div>
              <div style={styles.stepConnector} />
              <div style={styles.stepCircle}>3</div>
            </div>

            <div style={styles.formGrid}>
              {/* Left Column: Core Fields */}
              <div className="glass-panel" style={styles.formColCard}>
                <h3 style={styles.cardHeader}>RFQ Details</h3>
                
                <div className="form-group">
                  <label className="form-label">RFQ's title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Office Furniture procurement Q2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Furniture"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    placeholder="Ergonomic chairs and standing desks for 3rd floor"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.descriptionTextarea}
                  />
                </div>
              </div>

              {/* Right Column: Line Items, Assign, Attachments */}
              <div style={styles.formColRight}>
                {/* Line Items Table */}
                <div className="glass-panel" style={styles.formColCard}>
                  <h3 style={styles.cardHeader}>Line items</h3>
                  <table style={styles.itemsTable}>
                    <thead>
                      <tr style={styles.itemsThRow}>
                        <th style={styles.itemsTh}>item</th>
                        <th style={styles.itemsTh}>qty</th>
                        <th style={styles.itemsTh}>Unit</th>
                        <th style={styles.itemsTh}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((itemObj, index) => (
                        <tr key={index}>
                          <td style={styles.itemsTd}>
                            <input
                              type="text"
                              className="form-input"
                              style={styles.tableInput}
                              placeholder="Ergonomic chair"
                              value={itemObj.item}
                              onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                              required
                            />
                          </td>
                          <td style={styles.itemsTd}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ ...styles.tableInput, width: '80px' }}
                              value={itemObj.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              min="1"
                              required
                            />
                          </td>
                          <td style={styles.itemsTd}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ ...styles.tableInput, width: '80px' }}
                              placeholder="NOS"
                              value={itemObj.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              required
                            />
                          </td>
                          <td style={styles.itemsTd}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                style={styles.removeItemBtn}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="btn btn-secondary"
                    style={styles.addBtn}
                  >
                    + add line item
                  </button>
                </div>

                {/* Assign Vendors */}
                <div className="glass-panel" style={styles.formColCard}>
                  <h3 style={styles.cardHeader}>ASSIGN VENDORS</h3>
                  
                  {/* Selected Vendors List */}
                  <div style={styles.vendorTagsList}>
                    {assignedVendors.length === 0 ? (
                      <span style={styles.noVendorsText}>No vendors assigned yet. Select from below.</span>
                    ) : (
                      assignedVendors.map((username) => {
                        const vObj = availableVendors.find(v => v.username === username);
                        const displayName = vObj ? `${vObj.firstName} ${vObj.lastName}` : `@${username}`;
                        return (
                          <div key={username} style={styles.vendorTag}>
                            <span>{displayName}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVendor(username)}
                              style={styles.removeTagBtn}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Vendor Selector */}
                  <div style={styles.assignRow}>
                    <select
                      className="form-input"
                      style={styles.selectInput}
                      value={selectedVendorUsername}
                      onChange={(e) => setSelectedVendorUsername(e.target.value)}
                    >
                      <option value="">-- Choose Vendor --</option>
                      {availableVendors
                        .filter(v => !assignedVendors.includes(v.username))
                        .map(v => (
                          <option key={v.username} value={v.username}>
                            {v.firstName} {v.lastName} (@{v.username})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddVendor}
                      className="btn btn-secondary"
                      disabled={!selectedVendorUsername}
                    >
                      + add vendor
                    </button>
                  </div>
                </div>

                {/* Attachments */}
                <div className="glass-panel" style={styles.formColCard}>
                  <h3 style={styles.cardHeader}>Attachments</h3>
                  <div style={styles.dropzone}>
                    <label style={styles.dropzoneLabel}>
                      <span style={styles.dropzoneIcon}>📎</span>
                      <strong>Drag & drop files or click to upload</strong>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div style={styles.fileList}>
                      {attachments.map((file, idx) => (
                        <div key={idx} style={styles.fileItem}>
                          <span>📄 {file.name}</span>
                          <span style={styles.fileSize}>({Math.round(file.size / 1024)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={styles.footerRow}>
              <button
                onClick={() => handleSubmitRfq('Published')}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Save & Send to Vendors'}
              </button>
              <button
                onClick={() => handleSubmitRfq('Draft')}
                className="btn btn-secondary"
                disabled={loading}
              >
                Save as Draft
              </button>
            </div>
          </>
        )}
      </div>

      {/* VIEW DETAIL MODAL */}
      {selectedRfq && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel animate-fade-in" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>RFQ Details</h2>
              <button onClick={() => setSelectedRfq(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Title:</span>
                <span style={styles.detailValue}>{selectedRfq.title}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Category:</span>
                <span style={styles.detailValue}>{selectedRfq.category || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Deadline:</span>
                <span style={styles.detailValue}>{formatDeadline(selectedRfq.deadline)}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Status:</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: selectedRfq.status === 'Published' ? '#d1fae5' : '#f1f5f9',
                    color: selectedRfq.status === 'Published' ? '#065f46' : '#475569',
                    borderColor: selectedRfq.status === 'Published' ? '#a7f3d0' : '#cbd5e1',
                  }}
                >
                  {selectedRfq.status}
                </span>
              </div>
              {selectedRfq.description && (
                <div style={styles.detailItemBlock}>
                  <span style={styles.detailLabel}>Description:</span>
                  <div style={styles.detailBlockValue}>{selectedRfq.description}</div>
                </div>
              )}

              {/* Line Items List */}
              <div style={styles.detailItemBlock}>
                <span style={styles.detailLabel}>Line Items:</span>
                <table style={{ ...styles.table, marginTop: '8px' }}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Item</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRfq.items?.map((it, idx) => (
                      <tr key={idx} style={styles.trRow}>
                        <td style={styles.td}>{it.item}</td>
                        <td style={styles.td}>{it.quantity}</td>
                        <td style={styles.td}>{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assigned Vendors usernames */}
              <div style={styles.detailItemBlock}>
                <span style={styles.detailLabel}>Assigned Vendors:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {selectedRfq.assignedVendors?.length === 0 ? (
                    <span style={styles.noVendorsText}>No vendors invited.</span>
                  ) : (
                    selectedRfq.assignedVendors?.map(vendor => {
                      const uname = typeof vendor === 'object' ? vendor.username : vendor;
                      const displayName = typeof vendor === 'object' ? `${vendor.firstName} ${vendor.lastName} (@${vendor.username})` : `@${vendor}`;
                      return (
                        <span key={uname} style={styles.vendorUsernameTag}>
                          {displayName}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setSelectedRfq(null)} className="btn btn-secondary">
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
  tableCard: {
    overflow: 'hidden',
    marginBottom: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: 'var(--shadow-raised)',
  },
  tablePlaceholder: {
    padding: '50px',
    textAlign: 'center',
    color: 'var(--text-dim)',
    fontSize: '1.1rem',
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
    letterSpacing: '0.5px',
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
  rfqTitleText: {
    display: 'block',
    fontWeight: '600',
  },
  rfqDescText: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--text-dim)',
    marginTop: '2px',
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
  /* Form views - Steps progress bar */
  stepsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '35px',
    gap: '8px',
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
    backgroundColor: '#ffffff',
    border: '2px solid #22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#15803d',
    boxShadow: 'inset 1px 1px 3px #cbd5e1',
  },
  stepConnector: {
    height: '2px',
    width: '100px',
    backgroundColor: '#d1d9e6',
  },
  stepConnectorActive: {
    height: '2.5px',
    width: '100px',
    backgroundColor: '#22c55e',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '30px',
  },
  formColCard: {
    padding: '24px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
    marginBottom: '20px',
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
  descriptionTextarea: {
    minHeight: '130px',
    resize: 'vertical',
  },
  formColRight: {
    display: 'flex',
    flexDirection: 'column',
  },
  /* Line items table inside card */
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '16px',
  },
  itemsThRow: {
    borderBottom: '1px solid var(--border-light)',
  },
  itemsTh: {
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  itemsTd: {
    padding: '8px 12px',
    verticalAlign: 'middle',
  },
  tableInput: {
    padding: '8px 12px',
    fontSize: '0.9rem',
  },
  removeItemBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--error)',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '4px',
  },
  addBtn: {
    width: '100%',
    fontSize: '0.85rem',
    padding: '8px 16px',
  },
  /* Assign vendors tags styling */
  vendorTagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    minHeight: '50px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    boxShadow: 'var(--shadow-recessed-light)',
    marginBottom: '16px',
  },
  noVendorsText: {
    color: 'var(--text-dim)',
    fontSize: '0.9rem',
  },
  vendorTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    border: '1px solid #d1d9e6',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  removeTagBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.8rem',
  },
  assignRow: {
    display: 'flex',
    gap: '12px',
  },
  selectInput: {
    flex: 1,
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  /* Attachments drag & drop zone */
  dropzone: {
    border: '2px dashed #cbd5e1',
    borderRadius: '8px',
    background: '#f8fafc',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-recessed-light)',
  },
  dropzoneLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  dropzoneIcon: {
    fontSize: '1.8rem',
  },
  fileList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    background: '#ffffff',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d9e6',
  },
  fileSize: {
    color: 'var(--text-dim)',
  },
  /* Footer Buttons */
  footerRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-start',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '20px',
  },
  /* Modals Overlay */
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
  vendorUsernameTag: {
    padding: '4px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d9e6',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
  }
};
