-- Cloudflare D1 / SQLite Database Schema
-- Restaurant Table Reservation & Online Ordering Engine

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Customer', 'Staff', 'Admin', 'Moderator')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    openingHours TEXT NOT NULL,
    rating REAL DEFAULT 4.3,
    deliveryTime TEXT DEFAULT '25-35 mins',
    costForTwo INTEGER DEFAULT 600,
    offerText TEXT DEFAULT 'Flat 20% OFF',
    imageUrl TEXT,
    is_approved INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurantId INTEGER NOT NULL,
    tableNumber TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Reserved', 'Occupied')),
    floor_zone TEXT DEFAULT 'Main Hall',
    FOREIGN KEY(restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS table_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tableId INTEGER NOT NULL,
    lockedByUserId INTEGER NOT NULL,
    reservationDate TEXT NOT NULL,
    timeSlot TEXT NOT NULL,
    lockExpiresAt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tableId) REFERENCES tables(id) ON DELETE CASCADE,
    FOREIGN KEY(lockedByUserId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    restaurantId INTEGER NOT NULL,
    tableId INTEGER NOT NULL,
    reservationDate TEXT NOT NULL,
    timeSlot TEXT NOT NULL,
    guestsCount INTEGER DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK(status IN ('Pending', 'Confirmed', 'Cancelled')),
    specialRequests TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY(tableId) REFERENCES tables(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurantId INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    isAvailable INTEGER DEFAULT 1,
    dietaryTag TEXT DEFAULT 'Veg',
    imageUrl TEXT,
    FOREIGN KEY(restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    restaurantId INTEGER NOT NULL,
    orderType TEXT NOT NULL CHECK(orderType IN ('Dine-In', 'Delivery')),
    tableId INTEGER,
    deliveryAddress TEXT,
    totalAmount REAL NOT NULL,
    orderStatus TEXT NOT NULL DEFAULT 'Pending' CHECK(orderStatus IN ('Pending', 'Preparing', 'Out for Delivery', 'Served', 'Delivered', 'Cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY(tableId) REFERENCES tables(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    menuItemId INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(menuItemId) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    razorpayPaymentId TEXT,
    razorpayOrderId TEXT,
    razorpaySignature TEXT,
    amount REAL NOT NULL,
    paymentStatus TEXT NOT NULL DEFAULT 'Success' CHECK(paymentStatus IN ('Pending', 'Success', 'Failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    restaurantId INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    isFlagged INTEGER DEFAULT 0,
    isHidden INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices for performance and concurrency-lock queries
CREATE INDEX IF NOT EXISTS idx_table_locks ON table_locks(tableId, reservationDate, timeSlot);
CREATE INDEX IF NOT EXISTS idx_reservations ON reservations(tableId, reservationDate, timeSlot, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customerId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(orderStatus);
