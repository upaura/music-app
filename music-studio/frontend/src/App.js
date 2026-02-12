import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Analyze from './pages/Analyze';
import Collaborate from './pages/Collaborate';
import Game from './pages/Game';
import './App.css';

// Auth Context
const AuthContext = createContext(null);

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios interceptor for adding auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios interceptor for handling auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Navigation Component
function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">🎵 Music Studio</Link>
      </div>
      {user ? (
        <div className="nav-links">
          <Link to="/upload">Upload</Link>
          <Link to="/analyze">Analyze</Link>
          <Link to="/collaborate">Collaborate</Link>
          <Link to="/game">Beat Game</Link>
          <span className="user-greeting">Hi, {user.username}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </nav>
  );
}

// Home Component
function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      <h1>Welcome to Music Studio</h1>
      <p>Your personal platform for music analysis, collaboration, and beat creation.</p>
      
      {!isAuthenticated && (
        <div className="auth-prompt">
          <p>Please login or register to get started.</p>
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">Login</Link>
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </div>
        </div>
      )}
      
      {isAuthenticated && (
        <div className="features">
          <h2>Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>📤 Upload</h3>
              <p>Upload your audio files and store them securely.</p>
              <Link to="/upload">Get Started →</Link>
            </div>
            <div className="feature-card">
              <h3>🎵 Analyze</h3>
              <p>Get detailed analysis of tempo, key, and more.</p>
              <Link to="/analyze">Try It →</Link>
            </div>
            <div className="feature-card">
              <h3>🤝 Collaborate</h3>
              <p>Add verses and lyrics to your songs.</p>
              <Link to="/collaborate">Start Collab →</Link>
            </div>
            <div className="feature-card">
              <h3>🎮 Beat Game</h3>
              <p>Create and play your own beat patterns.</p>
              <Link to="/game">Play Now →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analyze" 
                element={
                  <ProtectedRoute>
                    <Analyze />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/collaborate" 
                element={
                  <ProtectedRoute>
                    <Collaborate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/game" 
                element={
                  <ProtectedRoute>
                    <Game />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

