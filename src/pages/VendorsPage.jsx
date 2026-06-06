import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Search/Filter states (Dropdown parameter selection removed)
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // All, Active, Blocked, Pending

  // Add Vendor Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [newVendor, setNewVendor] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'India',
    additionalInfo: '',
    gstNumber: '',
    category: '',
    status: 'Active',
    password: ''
  });

  // View Vendor details modal state
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Status counts (live calculations from the backend payload)
  const [counts, setCounts] = useState({ all: 0, active: 0, blocked: 0, pending: 0 });

  // Fetch vendors helper
  const fetchVendors = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('vb_token');
    if (!token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      // Build query string - Default search to Name parameter
      let url = `${API_BASE_URL}/api/vendors?page=${page}&limit=${limit}`;
      
      if (searchTerm.trim() !== '') {
        url += `&name=${encodeURIComponent(searchTerm.trim())}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load vendors.');
      }

      // Live backend data binding (no dummy/mock rows)
      setVendors(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalResults(result.pagination?.totalResults || 0);

      fetchCounts(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async (token) => {
    try {
      // Fetch high limit list to get exact status counts
      const res = await fetch(`${API_BASE_URL}/api/vendors?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        const data = resData.data;
        const activeCount = data.filter(v => v.status === 'Active').length;
        const blockedCount = data.filter(v => v.status === 'Blocked').length;
        const pendingCount = data.filter(v => v.status === 'Pending').length;
        setCounts({
          all: data.length,
          active: activeCount,
          blocked: blockedCount,
          pending: pendingCount
        });
      }
    } catch (e) {
      console.error('Error fetching counts', e);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, limit, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // reset to page 1 on new search
    fetchVendors();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setPage(1);
    setTimeout(() => fetchVendors(), 0);
  };

  // Toggle Vendor Status
  const handleToggleStatus = async (vendor) => {
    const token = localStorage.getItem('vb_token');
    const newStatus = vendor.status === 'Active' ? 'Blocked' : 'Active';

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/${vendor._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update vendor status.');
      }

      setSuccess(`Vendor "${vendor.firstName} ${vendor.lastName}" status updated to ${newStatus}.`);
      fetchVendors(); // reload data
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Create Vendor Form Submit
  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    const token = localStorage.getItem('vb_token');

    // Validation
    const { username, firstName, lastName, email, password } = newVendor;
    if (!username || !firstName || !lastName || !email || !password) {
      setModalError('Required fields: Username, First Name, Last Name, Email, and Password.');
      setModalLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newVendor)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create vendor.');
      }

      setSuccess('Vendor registered successfully!');
      setShowAddModal(false);
      
      // Reset new vendor state
      setNewVendor({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: 'India',
        additionalInfo: '',
        gstNumber: '',
        category: '',
        status: 'Active',
        password: ''
      });

      fetchVendors(); // reload list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Client side status tab filter
  const filteredVendors = vendors.filter(v => {
    if (activeTab === 'All') return true;
    return v.status === activeTab;
  });

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        {/* Vendors Header */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Vendors</h1>
            <p style={styles.subtitle}>Manage supplier profiles and registrations</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Add vendor
          </button>
        </div>

        {/* Search Bar - Option selector dropdown removed */}
        <form onSubmit={handleSearchSubmit} className="glass-panel" style={styles.searchBar}>
          <div style={styles.searchFieldsRow}>
            <input
              type="text"
              className="form-input"
              style={styles.searchInput}
              placeholder="Search vendors by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={styles.searchBtn}>
              Search
            </button>
            {searchTerm && (
              <button type="button" onClick={handleClearFilters} className="btn btn-secondary">
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Status Tabs */}
        <div style={styles.tabsRow}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'All' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('All')}
          >
            All ({counts.all})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'Active' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('Active')}
          >
            Active ({counts.active})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'Pending' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('Pending')}
          >
            Pending ({counts.pending})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'Blocked' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('Blocked')}
          >
            Blocked ({counts.blocked})
          </button>
        </div>

        {/* Vendors Table - 100% Live Backend Data */}
        <div className="glass-panel animate-fade-in" style={styles.tableCard}>
          {loading ? (
            <div style={styles.tablePlaceholder}>Loading vendors data...</div>
          ) : filteredVendors.length === 0 ? (
            <div style={styles.tablePlaceholder}>No vendors found.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Vendor Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>GST no.</th>
                  <th style={styles.th}>Contact no.</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor._id} style={styles.trRow}>
                    <td style={styles.td}>
                      <span style={styles.vendorNameText}>
                        {vendor.firstName} {vendor.lastName}
                      </span>
                      <span style={styles.vendorUserText}>@{vendor.username}</span>
                    </td>
                    <td style={styles.td}>{vendor.category || 'N/A'}</td>
                    <td style={styles.td}>{vendor.gstNumber || 'N/A'}</td>
                    <td style={styles.td}>{vendor.phone || 'N/A'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: vendor.status === 'Active' ? '#d1fae5' : '#fee2e2',
                          color: vendor.status === 'Active' ? '#065f46' : '#991b1b',
                          borderColor: vendor.status === 'Active' ? '#a7f3d0' : '#fca5a5',
                        }}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="btn btn-secondary"
                          style={styles.actionBtn}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleToggleStatus(vendor)}
                          className="btn btn-secondary"
                          style={{
                            ...styles.actionBtn,
                            borderColor: vendor.status === 'Active' ? '#fca5a5' : '#a7f3d0',
                            color: vendor.status === 'Active' ? '#991b1b' : '#065f46',
                            backgroundColor: vendor.status === 'Active' ? '#fef2f2' : '#ecfdf5'
                          }}
                        >
                          {vendor.status === 'Active' ? 'Block' : 'Unblock'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div style={styles.paginationRow}>
          <div style={styles.paginationBrief}>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalResults} total records)
          </div>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="btn btn-secondary"
              style={styles.pageBtn}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="btn btn-secondary"
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ADD VENDOR MODAL OVERLAY */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel animate-fade-in" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Vendor</h2>
              <button onClick={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            {modalError && <div className="alert alert-danger">{modalError}</div>}

            <form onSubmit={handleAddVendorSubmit} style={styles.modalForm}>
              <div style={styles.modalRow}>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="widgets_inc"
                    value={newVendor.username}
                    onChange={(e) => setNewVendor({ ...newVendor, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Temporary Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="InitialTempPass123!"
                    value={newVendor.password}
                    onChange={(e) => setNewVendor({ ...newVendor, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalRow}>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Widgets"
                    value={newVendor.firstName}
                    onChange={(e) => setNewVendor({ ...newVendor, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Incorporated"
                    value={newVendor.lastName}
                    onChange={(e) => setNewVendor({ ...newVendor, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalRow}>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="info@widgets.example.com"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+918888888888"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.modalRow}>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">GST Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="22AAAAA0000A1Z5"
                    value={newVendor.gstNumber}
                    onChange={(e) => setNewVendor({ ...newVendor, gstNumber: e.target.value })}
                  />
                </div>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Hardware"
                    value={newVendor.category}
                    onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.modalRow}>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="India"
                    value={newVendor.country}
                    onChange={(e) => setNewVendor({ ...newVendor, country: e.target.value })}
                  />
                </div>
                <div className="form-group" style={styles.modalCol}>
                  <label className="form-label">Initial Status</label>
                  <select
                    className="form-input"
                    value={newVendor.status}
                    onChange={(e) => setNewVendor({ ...newVendor, status: e.target.value })}
                    style={styles.selectInput}
                  >
                    <option value="Active">Active</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Information</label>
                <textarea
                  className="form-input"
                  placeholder="Preferred vendor details..."
                  value={newVendor.additionalInfo}
                  onChange={(e) => setNewVendor({ ...newVendor, additionalInfo: e.target.value })}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={styles.modalBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={styles.modalBtn}
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedVendor && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel animate-fade-in" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Vendor Details</h2>
              <button onClick={() => setSelectedVendor(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Full Name:</span>
                <span style={styles.detailValue}>
                  {selectedVendor.firstName} {selectedVendor.lastName}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Username:</span>
                <span style={styles.detailValue}>@{selectedVendor.username}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Email:</span>
                <span style={styles.detailValue}>{selectedVendor.email}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Contact No:</span>
                <span style={styles.detailValue}>{selectedVendor.phone || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>GST Number:</span>
                <span style={styles.detailValue}>{selectedVendor.gstNumber || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Category:</span>
                <span style={styles.detailValue}>{selectedVendor.category || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Country:</span>
                <span style={styles.detailValue}>{selectedVendor.country || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Status:</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: selectedVendor.status === 'Active' ? '#d1fae5' : '#fee2e2',
                    color: selectedVendor.status === 'Active' ? '#065f46' : '#991b1b',
                    borderColor: selectedVendor.status === 'Active' ? '#a7f3d0' : '#fca5a5',
                  }}
                >
                  {selectedVendor.status}
                </span>
              </div>
              {selectedVendor.additionalInfo && (
                <div style={styles.detailItemBlock}>
                  <span style={styles.detailLabel}>Additional Information:</span>
                  <div style={styles.detailBlockValue}>{selectedVendor.additionalInfo}</div>
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setSelectedVendor(null)} className="btn btn-secondary">
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
  searchBar: {
    padding: '16px 20px',
    marginBottom: '28px',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  searchFieldsRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
  },
  searchBtn: {
    padding: '12px 24px',
  },
  tabsRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  tab: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #d1d9e6',
    color: 'var(--text-muted)',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  activeTab: {
    borderColor: '#22c55e',
    backgroundColor: '#ffffff',
    color: '#166534',
    boxShadow: 'inset 2px 2px 4px #cbd5e1',
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
  vendorNameText: {
    display: 'block',
    fontWeight: '600',
  },
  vendorUserText: {
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
  actionCell: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem',
    borderRadius: '4px',
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  paginationBrief: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  paginationButtons: {
    display: 'flex',
    gap: '10px',
  },
  pageBtn: {
    padding: '8px 16px',
    fontSize: '0.9rem',
  },
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
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  modalRow: {
    display: 'flex',
    gap: '16px',
  },
  modalCol: {
    flex: 1,
    minWidth: '0',
  },
  selectInput: {
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '20px',
  },
  modalBtn: {
    minWidth: '100px',
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
  }
};
