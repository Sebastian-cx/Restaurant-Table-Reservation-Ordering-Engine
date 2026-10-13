import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import {
  UtensilsCrossed,
  CalendarCheck,
  ShoppingBag,
  ChefHat,
  ShieldCheck,
  MapPin,
  ChevronDown,
  LogOut,
  User,
  Radio,
  Search,
  MessageSquare
} from 'lucide-react';

export default function Navbar({ onOpenCart }) {
  const { user, logout, quickSwitchRole, loading } = useAuth();
  const { cartCount, cartTotal } = useCart();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedLocation, setSelectedLocation] = useState('Guindy, Chennai (ITC Grand Chola)');
  const [showLocDropdown, setShowLocDropdown] = useState(false);

  const currentRole = user?.role || 'Customer';

  return (
    <header>
      {/* Main Navbar */}
      <nav className="main-navbar">
        <div className="container nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/" className="brand">
              <div className="brand-icon">
                <UtensilsCrossed size={20} />
              </div>
              <span style={{ color: '#1c1c1c' }}>Feast<span style={{ color: '#e23744' }}>Hub</span></span>
            </Link>

            {/* Swiggy/Zomato Location Selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowLocDropdown(!showLocDropdown)}
                className="location-picker"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}
              >
                <MapPin size={16} color="#e23744" />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                  <span style={{ fontSize: '0.68rem', color: '#686b78', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Location</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1c1c1c' }}>{selectedLocation.split('(')[0].trim()}</span>
                </div>
                <ChevronDown size={14} color="#686b78" style={{ marginLeft: '4px' }} />
              </button>

              {showLocDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    width: 290,
                    background: 'white',
                    borderRadius: 10,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 999,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>
                    SELECT DINING &amp; DELIVERY REGION
                  </div>
                  {[
                    'Guindy, Chennai (ITC Grand Chola)',
                    'MRC Nagar, Chennai (The Leela Palace)',
                    'Nungambakkam, Chennai (Taj Coromandel)',
                    'T. Nagar, Chennai (Saravana Bhavan)',
                    'Mount Road, Chennai (Buhari 1951)',
                    'Triplicane, Chennai (Ratna Cafe)',
                    'Besant Nagar, Chennai (Thalappakatti)',
                    'Indiranagar, Bengaluru'
                  ].map((loc) => (
                    <div
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setShowLocDropdown(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid #f1f5f9',
                        background: selectedLocation === loc ? '#fff1f2' : 'white',
                        color: selectedLocation === loc ? '#e11d48' : '#1e293b',
                        fontWeight: selectedLocation === loc ? 700 : 500
                      }}
                    >
                      <MapPin size={13} color={selectedLocation === loc ? '#e11d48' : '#94a3b8'} />
                      <span>{loc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="nav-links">
            {(!user || user.role === 'Customer') && (
              <>
                <Link
                  to="/"
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                  Delivery
                </Link>
                <Link
                  to="/tables"
                  className={`nav-link ${location.pathname === '/tables' ? 'active' : ''}`}
                >
                  <CalendarCheck size={16} /> Dine-In & Tables
                </Link>
                <Link
                  to="/menu"
                  className={`nav-link ${location.pathname === '/menu' ? 'active' : ''}`}
                >
                  <UtensilsCrossed size={16} /> Full Menu
                </Link>
                {user && (
                  <>
                    <Link
                      to="/my-orders"
                      className={`nav-link ${location.pathname === '/my-orders' ? 'active' : ''}`}
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/my-reservations"
                      className={`nav-link ${location.pathname === '/my-reservations' ? 'active' : ''}`}
                    >
                      My Bookings
                    </Link>
                  </>
                )}
                <Link
                  to="/reviews"
                  className={`nav-link ${location.pathname === '/reviews' ? 'active' : ''}`}
                >
                  Reviews
                </Link>
              </>
            )}

            {user?.role === 'Staff' && (
              <>
                <Link
                  to="/staff/orders"
                  className={`nav-link ${location.pathname === '/staff/orders' ? 'active' : ''}`}
                >
                  <ChefHat size={16} /> Kitchen Live Orders
                </Link>
                <Link
                  to="/staff/tables"
                  className={`nav-link ${location.pathname === '/staff/tables' ? 'active' : ''}`}
                >
                  <CalendarCheck size={16} /> Floor Seating
                </Link>
                <Link
                  to="/staff/menu"
                  className={`nav-link ${location.pathname === '/staff/menu' ? 'active' : ''}`}
                >
                  <UtensilsCrossed size={16} /> Menu Inventory
                </Link>
              </>
            )}

            {user?.role === 'Admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
                >
                  <ShieldCheck size={16} /> Overview
                </Link>
                <Link
                  to="/admin/restaurants"
                  className={`nav-link ${location.pathname === '/admin/restaurants' ? 'active' : ''}`}
                >
                  Restaurants
                </Link>
                <Link
                  to="/admin/users"
                  className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
                >
                  Users
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className={`nav-link ${location.pathname === '/admin/audit-logs' ? 'active' : ''}`}
                >
                  Audit Logs
                </Link>
              </>
            )}

            {user?.role === 'Moderator' && (
              <>
                <Link
                  to="/moderator"
                  className={`nav-link ${location.pathname === '/moderator' ? 'active' : ''}`}
                >
                  <ShieldCheck size={16} /> Moderation Queue
                </Link>
                <Link
                  to="/reviews"
                  className={`nav-link ${location.pathname === '/reviews' ? 'active' : ''}`}
                >
                  All Reviews
                </Link>
              </>
            )}
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Real-time Socket.IO Connection Badge */}
            <div
              title={isConnected ? 'Real-Time WebSocket Engine Connected' : 'Connecting to Real-Time Engine...'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: isConnected ? '#f0fdf4' : '#fffbeb',
                color: isConnected ? '#16a34a' : '#d97706',
                border: '1px solid',
                borderColor: isConnected ? '#bbf7d0' : '#fde68a'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isConnected ? '#16a34a' : '#f59e0b',
                  boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
                  display: 'inline-block'
                }}
              />
              <span>{isConnected ? 'Live' : 'Syncing'}</span>
            </div>

            {(!user || user.role === 'Customer') && (
              <button
                onClick={onOpenCart}
                className="btn btn-outline btn-sm"
                style={{ position: 'relative', border: '1px solid #e2e8f0', fontWeight: 700 }}
              >
                <ShoppingBag size={17} color="#e23744" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span
                    style={{
                      background: '#e23744',
                      color: 'white',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      marginLeft: '2px'
                    }}
                  >
                    {cartCount} (₹{cartTotal})
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.name}</div>
                  <span className={`badge ${
                    user.role === 'Admin' ? 'badge-danger' :
                    user.role === 'Staff' ? 'badge-warning' :
                    user.role === 'Moderator' ? 'badge-primary' : 'badge-success'
                  }`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    {user.role === 'Staff' ? 'Kitchen Partner' : user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="btn btn-outline btn-sm"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to="/login" className="btn btn-outline btn-sm">
                  <User size={15} /> Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
