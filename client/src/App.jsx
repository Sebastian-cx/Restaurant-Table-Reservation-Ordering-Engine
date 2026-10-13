import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

import Navbar from './components/Navbar';
import CartModal from './components/CartModal';
import DemoSwitcher from './components/DemoSwitcher';
import ProtectedRoute from './components/ProtectedRoute';

// Customer Pages
import Home from './pages/Customer/Home';
import TableBooking from './pages/Customer/TableBooking';
import MenuOrder from './pages/Customer/MenuOrder';
import Checkout from './pages/Customer/Checkout';
import OrderTracking from './pages/Customer/OrderTracking';
import MyReservations from './pages/Customer/MyReservations';
import Reviews from './pages/Customer/Reviews';

// Staff Pages
import StaffOrders from './pages/Staff/StaffOrders';
import StaffTables from './pages/Staff/StaffTables';
import StaffMenu from './pages/Staff/StaffMenu';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminRestaurants from './pages/Admin/AdminRestaurants';
import AdminAuditLogs from './pages/Admin/AdminAuditLogs';

// Moderator Pages
import ModeratorPanel from './pages/Moderator/ModeratorPanel';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <CartProvider>
        <SocketProvider>
          <BrowserRouter>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Navbar onOpenCart={() => setIsCartOpen(true)} />
              
              <main style={{ flex: 1 }}>
                <Routes>
                  {/* Public / Customer Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/tables" element={<TableBooking />} />
                  <Route path="/menu" element={<MenuOrder onOpenCart={() => setIsCartOpen(true)} />} />
                  <Route path="/reviews" element={<Reviews />} />

                  {/* Customer Protected Routes */}
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-orders"
                    element={
                      <ProtectedRoute>
                        <OrderTracking />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-reservations"
                    element={
                      <ProtectedRoute>
                        <MyReservations />
                      </ProtectedRoute>
                    }
                  />

                  {/* Staff Protected Routes */}
                  <Route
                    path="/staff/orders"
                    element={
                      <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                        <StaffOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/tables"
                    element={
                      <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                        <StaffTables />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/menu"
                    element={
                      <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                        <StaffMenu />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Protected Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/restaurants"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminRestaurants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit-logs"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminAuditLogs />
                      </ProtectedRoute>
                    }
                  />

                  {/* Moderator Protected Routes */}
                  <Route
                    path="/moderator"
                    element={
                      <ProtectedRoute allowedRoles={['Moderator', 'Admin']}>
                        <ModeratorPanel />
                      </ProtectedRoute>
                    }
                  />

                  {/* Auth */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              <DemoSwitcher />

              {/* Academic Review Footer */}
              {/* FeastHub Consumer Footer */}
              <footer style={{ background: '#0f172a', color: '#94a3b8', borderTop: '1px solid #1e293b', padding: '2.5rem 0 1.5rem', fontSize: '0.85rem' }}>
                <div className="container">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                        Feast<span style={{ color: '#e23744' }}>Hub</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#94a3b8' }}>
                        Real-time restaurant table reservations and doorstep food delivery platform.
                      </p>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.75rem', fontSize: '0.85rem' }}>COMPANY</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span>About Us</span>
                        <span>Careers</span>
                        <span>Team</span>
                        <span>FeastHub One</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.75rem', fontSize: '0.85rem' }}>FOR RESTAURANTS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span>Partner With Us</span>
                        <span>Apps for Restaurant Partners</span>
                        <span>Table Seating Manager</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: 'white', marginBottom: '0.75rem', fontSize: '0.85rem' }}>AVAILABLE IN</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span>Bengaluru</span>
                        <span>Chennai</span>
                        <span>Mumbai</span>
                        <span>Delhi NCR</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>© 2026 FeastHub Technologies Ltd. All rights reserved.</span>
                    <span>Privacy Policy • Terms of Service • Security</span>
                  </div>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </SocketProvider>
      </CartProvider>
    </AuthProvider>
  );
}
