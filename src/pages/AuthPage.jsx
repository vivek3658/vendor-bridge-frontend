import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://vendor-bridge-backend.onrender.com';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Login Form State
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  // Register Form State
  const [registerData, setRegisterData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Procurement Officer',
    country: 'India',
    additionalInfo: '',
    password: '',
    confirmPassword: ''
  });

  // Dynamic Avatar URL helper
  const getAvatarUrl = (uname) => {
    if (!uname) return 'https://api.dicebear.com/7.x/bottts/svg?seed=placeholder';
    return `${API_BASE_URL}/api/auth/user-image/${encodeURIComponent(uname)}`;
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!loginData.username || !loginData.password) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed. Please verify credentials.');
      }

      setSuccess('Login successful! Redirecting...');
      localStorage.setItem('vb_token', result.token);
      localStorage.setItem('vb_user', JSON.stringify(result.data));

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validations
    const { username, firstName, lastName, email, phone, role, country, password, confirmPassword } = registerData;
    if (!username || !firstName || !lastName || !email || !password) {
      setError('Required fields: Username, First Name, Last Name, Email, and Password.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        username,
        firstName,
        lastName,
        email,
        phone,
        role,
        country,
        additionalInfo: registerData.additionalInfo,
        password
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed.');
      }

      setSuccess('Registration successful! Logging you in...');
      localStorage.setItem('vb_token', result.token);
      localStorage.setItem('vb_user', JSON.stringify(result.data));

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('vb_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div style={styles.authContainer}>
      <div style={styles.brandingHeader}>
        <h1 style={styles.brandTitle}>VendorBridge</h1>
        <p style={styles.brandSub}>Procurement & Vendor Management ERP</p>
      </div>

      <div className="glass-panel animate-fade-in" style={styles.authCard}>
        {/* Tab Selection (Skeuomorphic toggle track) */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(isLogin ? styles.activeTab : {})
            }}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccess('');
            }}
          >
            Sign In
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(!isLogin ? styles.activeTab : {})
            }}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccess('');
            }}
          >
            Register
          </button>
        </div>

        {/* Global Feedback Messages */}
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {isLogin ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            <div style={styles.avatarWrapper}>
              <img
                src={getAvatarUrl(loginData.username)}
                alt="User Avatar"
                style={styles.avatarImage}
                onError={(e) => {
                  e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={handleLoginChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <div style={styles.avatarWrapper}>
              <img
                src={getAvatarUrl(registerData.username)}
                alt="User Avatar"
                style={styles.avatarImage}
                onError={(e) => {
                  e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=fallback';
                }}
              />
            </div>

            <div style={styles.row}>
              <div className="form-group" style={styles.col}>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  className="form-input"
                  placeholder="John"
                  value={registerData.firstName}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  className="form-input"
                  placeholder="Doe"
                  value={registerData.lastName}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>

            <div style={styles.row}>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  placeholder="johndoe"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="john.doe@example.com"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>

            <div style={styles.row}>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-input"
                  placeholder="+919876543210"
                  value={registerData.phone}
                  onChange={handleRegisterChange}
                />
              </div>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Country</label>
                <input
                  type="text"
                  name="country"
                  className="form-input"
                  placeholder="India"
                  value={registerData.country}
                  onChange={handleRegisterChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                name="role"
                className="form-input"
                value={registerData.role}
                onChange={handleRegisterChange}
                style={styles.selectInput}
                required
              >
                <option value="Procurement Officer">Procurement Officer</option>
                <option value="Vendor">Vendor</option>
                <option value="Manager">Manager / Approver</option>
              </select>
            </div>

            <div style={styles.row}>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              <div className="form-group" style={styles.col}>
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="••••••••"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Information</label>
              <textarea
                name="additionalInfo"
                className="form-input"
                placeholder="Dynamic procurement officer profile..."
                value={registerData.additionalInfo}
                onChange={handleRegisterChange}
                style={styles.textarea}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 20px',
    backgroundColor: 'var(--bg-main)',
  },
  brandingHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '3rem',
    fontWeight: '700',
    color: 'var(--primary)',
    letterSpacing: '-1.5px',
    marginBottom: '8px',
  },
  brandSub: {
    fontSize: '1.05rem',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  authCard: {
    width: '100%',
    maxWidth: '560px',
    padding: '40px',
    backgroundColor: '#ffffff',
    boxShadow: 'var(--shadow-raised)',
  },
  tabContainer: {
    display: 'flex',
    borderRadius: 'var(--radius-md)',
    background: '#e2e8f0',
    boxShadow: 'var(--shadow-recessed-light)',
    padding: '4px',
    marginBottom: '30px',
    border: '1px solid #cbd5e1',
  },
  tabButton: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: '#ffffff',
    color: 'var(--primary)',
    border: '1px solid #d1d9e6',
    boxShadow: '2px 2px 4px #cbd5e1',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  avatarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '28px',
  },
  avatarImage: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--primary)',
    padding: '4px',
    background: '#ffffff',
    boxShadow: 'var(--shadow-raised-sm)',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  col: {
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
  submitBtn: {
    marginTop: '10px',
    width: '100%',
  }
};
