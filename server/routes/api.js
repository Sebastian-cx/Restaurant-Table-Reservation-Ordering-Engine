const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');
const authController = require('../controllers/authController');
const tableController = require('../controllers/tableController');
const orderController = require('../controllers/orderController');
const menuController = require('../controllers/menuController');
const paymentController = require('../controllers/paymentController');
const adminController = require('../controllers/adminController');
const moderatorController = require('../controllers/moderatorController');

// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/quick-login/:role', authController.quickLogin);
router.post('/auth/quick-login-email', authController.quickLoginByEmail);
router.get('/auth/me', verifyToken, authController.getMe);

// --- Table & Reservation Routes ---
// Optional token for getTables so we know if a table is locked by "me"
router.get('/tables', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return verifyToken(req, res, () => tableController.getTables(req, res));
  }
  return tableController.getTables(req, res);
});
router.post('/tables/lock', verifyToken, tableController.acquireLock);
router.post('/tables/release-lock', verifyToken, tableController.releaseLock);
router.post('/tables/book', verifyToken, tableController.bookTable);
router.post('/tables/:id/cancel', verifyToken, tableController.cancelReservation);
router.get('/tables/my-reservations', verifyToken, tableController.getCustomerReservations);
router.get('/tables/staff-reservations', verifyToken, requireRole(['Staff', 'Admin']), tableController.getStaffReservations);
router.put('/tables/:id/status', verifyToken, requireRole(['Staff', 'Admin']), tableController.updateTableStatus);

// --- Menu Routes ---
router.get('/menu', menuController.getMenu);
router.post('/menu', verifyToken, requireRole(['Staff', 'Admin']), menuController.addMenuItem);
router.put('/menu/:id', verifyToken, requireRole(['Staff', 'Admin']), menuController.updateMenuItem);
router.patch('/menu/:id/toggle', verifyToken, requireRole(['Staff', 'Admin']), menuController.toggleAvailability);
router.delete('/menu/:id', verifyToken, requireRole(['Staff', 'Admin']), menuController.deleteMenuItem);

// --- Order Routes ---
router.post('/orders', verifyToken, orderController.createOrder);
router.get('/orders/my-orders', verifyToken, orderController.getCustomerOrders);
router.get('/orders/kitchen', verifyToken, requireRole(['Staff', 'Admin']), orderController.getKitchenOrders);
router.get('/orders/:id', verifyToken, orderController.getOrderById);
router.put('/orders/:id/status', verifyToken, requireRole(['Staff', 'Admin']), orderController.updateOrderStatus);

// --- Payment Routes (Razorpay + HMAC-SHA256) ---
router.post('/payments/create-order', verifyToken, paymentController.createRazorpayOrder);
router.post('/payments/verify', verifyToken, paymentController.verifyPayment);

// --- Admin Routes ---
router.get('/admin/stats', verifyToken, requireRole(['Admin']), adminController.getPlatformStats);
router.get('/admin/reservations', verifyToken, requireRole(['Admin']), adminController.listAllReservations);
router.put('/admin/reservations/:id/status', verifyToken, requireRole(['Admin']), adminController.updateReservationStatus);
router.get('/admin/users', verifyToken, requireRole(['Admin']), adminController.listUsers);
router.put('/admin/users/:id/role', verifyToken, requireRole(['Admin']), adminController.updateUserRole);
router.get('/admin/restaurants', adminController.listRestaurants);
router.post('/admin/restaurants', verifyToken, requireRole(['Admin']), adminController.createRestaurant);
router.patch('/admin/restaurants/:id/approve', verifyToken, requireRole(['Admin']), adminController.approveRestaurant);
router.get('/admin/audit-logs', verifyToken, requireRole(['Admin']), adminController.getAuditLogs);

// --- Reviews & Moderation Routes ---
router.get('/reviews', moderatorController.getReviews);
router.post('/reviews', verifyToken, moderatorController.addReview);
router.post('/reviews/:id/flag', verifyToken, moderatorController.flagReview);
router.get('/moderator/queue', verifyToken, requireRole(['Moderator', 'Admin']), moderatorController.getModeratorQueue);
router.post('/moderator/reviews/:id/resolve', verifyToken, requireRole(['Moderator', 'Admin']), moderatorController.resolveReviewFlag);

module.exports = router;
