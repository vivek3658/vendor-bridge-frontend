import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [category, setCategory] = useState('');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Load user data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('vb_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      
      // Populate fields
      setFirstName(parsed.firstName || '');
      setLastName(parsed.lastName || '');
      setPhone(parsed.phone || '');
      setCountry(parsed.country || '');
      setAdditionalInfo(parsed.additionalInfo || '');
      setGstNumber(parsed.gstNumber || '');
      setCategory(parsed.category || '');
      
      if (parsed.address) {
        setStreet(parsed.address.street || '');
        setCity(parsed.address.city || '');
        setState(parsed.address.state || '');
        setZipCode(parsed.address.zipCode || '');
      }
    }
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('vb_token');
    
    const payload = {
      firstName,
      lastName,
      phone,
      country,
      additionalInfo,
      gstNumber,
      category,
      address: {
        street,
        city,
        state,
        zipCode
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile.');
      }

      setSuccess('Profile details updated successfully!');
      // Update local storage
      localStorage.setItem('vb_user', JSON.stringify(result.data));
      setUser(result.data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={styles.pageContainer}>
      <Sidebar />

      <div style={styles.mainContent}>
        {/* Toast Feedbacks */}
        {success && <div className="alert alert-success animate-fade-in" style={styles.toast}>{success}</div>}
        {error && <div className="alert alert-danger animate-fade-in" style={styles.toast}>{error}</div>}

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Profile Settings</h1>
            <p style={styles.subtitle}>Manage your business details and corporate identity</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="glass-panel animate-fade-in" style={styles.formCard}>
          <h3 style={styles.sectionHeader}>Basic Account Information</h3>
          
          <div style={styles.row}>
            <div className="form-group" style={styles.col}>
              <label className="form-label">First Name</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Email Address (Read-only)</label>
              <input
                type="email"
                className="form-input"
                value={user.email}
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Country</label>
              <input
                type="text"
                className="form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input"
                value={user.role}
                disabled
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {user.role === 'Vendor' && (
            <>
              <h3 style={{ ...styles.sectionHeader, marginTop: '20px' }}>Vendor Business Details</h3>
              <div style={styles.row}>
                <div className="form-group" style={styles.col}>
                  <label className="form-label">GSTIN / GST Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={styles.col}>
                  <label className="form-label">Vendor Category</label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={styles.selectInput}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="IT Hardware">IT Hardware</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Stationery">Stationery</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <h3 style={{ ...styles.sectionHeader, marginTop: '20px' }}>Office Address Details</h3>
          
          <div className="form-group">
            <label className="form-label">Street / Office Address</label>
            <input
              type="text"
              className="form-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          <div style={styles.row}>
            <div className="form-group" style={styles.col}>
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-group" style={styles.col}>
              <label className="form-label">State</label>
              <input
                type="text"
                className="form-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="form-group" style={styles.col}>
              <label className="form-label">Zip Code</label>
              <input
                type="text"
                className="form-input"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label">Additional Description</label>
            <textarea
              className="form-input"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              style={styles.textarea}
            />
          </div>

          <div style={styles.footerRow}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
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
  formCard: {
    padding: '36px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: 'var(--shadow-raised)',
    maxWidth: '800px',
    textAlign: 'left',
  },
  sectionHeader: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '18px',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '8px',
  },
  row: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  col: {
    flex: 1,
    minWidth: '200px',
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
  footerRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: '20px',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '20px',
  }
};
