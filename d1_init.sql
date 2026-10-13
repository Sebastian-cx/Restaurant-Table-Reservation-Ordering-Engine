-- Cloudflare D1 Initialization Script
-- Generated for FeastHub

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


-- Clear existing records
DELETE FROM audit_logs;
DELETE FROM reviews;
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM menu_items;
DELETE FROM reservations;
DELETE FROM table_locks;
DELETE FROM tables;
DELETE FROM restaurants;
DELETE FROM users;
DELETE FROM sqlite_sequence;

-- Table: users (9 rows)
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (1, 'Rahul Sharma', 'customer@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (2, 'Chef Rajesh (Kitchen Partner)', 'staff@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Staff', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (3, 'Platform Admin', 'admin@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Admin', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (4, 'Trust & Safety Lead', 'moderator@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Moderator', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (5, 'Sebastian', 'sebastian@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (6, 'Tashu', 'tashu@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (7, 'Rishika', 'rishika@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (8, 'Arjun', 'arjun@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');
INSERT INTO users (id, name, email, passwordHash, role, created_at) VALUES (9, 'Ananya', 'ananya@demo.com', '$2b$10$cRt5SsBkazkJg9gmb5Gl5OafGGjhvWqziUcNXlRJdwyM/FrexXns.', 'Customer', '2026-10-06 04:02:33');

-- Table: restaurants (11 rows)
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (1, 'ITC Grand Chola — The Madras Pavilion & Peshawri', '63, Anna Salai, Little Mount, Guindy, Chennai', 'Frontier Kebabs, Mughlai, Royal South Indian Buffet', '12:30 PM - 11:30 PM', 4.9, '35-40 mins', 2400, '20% OFF UP TO ₹300', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:33');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (2, 'The Leela Palace — Jamavar', 'Adyar Seaface, MRC Nagar, Raja Annamalaipuram, Chennai', 'Royal Awadhi, Coastal Seafood, Gourmet South Indian', '12:00 PM - 11:00 PM', 4.9, '40-45 mins', 2800, 'FLAT ₹250 OFF ON LUXURY DINING', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (3, 'Taj Coromandel — Southern Spice', '37, Mahatma Gandhi Road, Nungambakkam, Chennai', 'Heritage South Indian, Chettinad, Kerala & Mangalorean', '12:30 PM - 11:00 PM', 4.8, '30-35 mins', 2200, 'CHEF TASTING MENU 15% OFF', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (4, 'Hotel Saravana Bhavan (Original Since 1981)', '21, Kennet Lane, Egmore / Pondy Bazaar, T. Nagar, Chennai', 'Pure Vegetarian, South Indian Tiffin, Meals, Filter Coffee', '06:30 AM - 10:30 PM', 4.7, '20-25 mins', 350, 'FLAT ₹75 OFF ABOVE ₹299', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (5, 'Murugan Idli Shop', '77-1/A, G.N. Chetty Road, T. Nagar, Chennai', 'South Indian Tiffin, Podi Idlis, Madurai Jigarthanda', '07:00 AM - 11:00 PM', 4.7, '15-20 mins', 300, '20% OFF ABOVE ₹200', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (6, 'Buhari Hotel (Est. 1951 — Birthplace of Chicken 65)', '83, Anna Salai, Mount Road, Chennai', 'Heritage Dum Biryani, Chicken 65, Mughlai, Ceylon Parotta', '11:30 AM - 11:30 PM', 4.6, '25-30 mins', 650, 'BIRTHPLACE OF 65: ₹100 OFF', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (7, 'Anjappar Chettinad Restaurant', '7/2, Jagannathan Road, Nungambakkam, Chennai', 'Authentic Karaikudi Chettinad, Spicy Seafood & Biryani', '11:30 AM - 11:00 PM', 4.5, '25-30 mins', 700, 'FREE MUTTON SOUP ABOVE ₹500', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (8, 'Dindigul Thalappakatti Biriyani', 'No. 42, 2nd Avenue, Besant Nagar Beach, Chennai', 'Authentic Seeraga Samba Thalappakatti Mutton Biryani', '11:00 AM - 11:00 PM', 4.5, '25-30 mins', 600, '15% OFF ON BIRYANI COMBO', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (9, 'Ratna Cafe (Est. 1948)', '255, Triplicane High Road, Triplicane, Chennai', 'Legendary Brass Bucket Sambar, South Indian Tiffin, Filter Coffee', '06:00 AM - 10:30 PM', 4.6, '20-25 mins', 250, 'FREE FILTER COFFEE ABOVE ₹200', 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (10, 'Urban Woodfire Pizzeria', 'North Usman Road, T. Nagar, Chennai', 'Pizzas, Pasta, Italian, Garlic Bread', '12:00 PM - 11:00 PM', 4.6, '20-25 mins', 550, 'FLAT ₹125 OFF', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved, created_at) VALUES (11, 'The Royal Spice Kitchen', '100 Feet Road, Indiranagar, Bengaluru', 'North Indian, Mughlai, Biryani', '11:00 AM - 11:30 PM', 4.4, '25-30 mins', 700, '50% OFF UP TO ₹100', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80', 1, '2026-10-06 04:02:34');

-- Table: tables (66 rows)
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (1, 1, 'T1', 2, 'Available', 'Chola Dynasty Atrium');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (2, 1, 'T2', 2, 'Available', 'Chola Dynasty Atrium');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (3, 1, 'T3', 4, 'Available', 'Peshawri Royal Pavilion');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (4, 1, 'T4', 4, 'Available', 'Peshawri Royal Pavilion');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (5, 1, 'T5', 6, 'Available', 'Imperial Dining Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (6, 1, 'T6', 8, 'Available', 'Emperor VIP Lounge');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (7, 2, 'T1', 2, 'Available', 'Bay View Window Alcove');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (8, 2, 'T2', 2, 'Available', 'Bay View Window Alcove');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (9, 2, 'T3', 4, 'Available', 'Maharaja Dining Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (10, 2, 'T4', 4, 'Available', 'Maharaja Dining Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (11, 2, 'T5', 6, 'Available', 'Lotus Sea Courtyard');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (12, 2, 'T6', 8, 'Available', 'Palace Royal Suite');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (13, 3, 'T1', 2, 'Available', 'Temple Carving Alcove');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (14, 3, 'T2', 2, 'Available', 'Temple Carving Alcove');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (15, 3, 'T3', 4, 'Available', 'Lotus Sanctum Dining');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (16, 3, 'T4', 4, 'Available', 'Lotus Sanctum Dining');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (17, 3, 'T5', 6, 'Available', 'Coromandel Verandah');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (18, 3, 'T6', 8, 'Available', 'Private Coromandel Suite');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (19, 4, 'T1', 2, 'Available', 'Tiffin Window Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (20, 4, 'T2', 2, 'Available', 'Tiffin Window Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (21, 4, 'T3', 4, 'Available', 'AC Family Dining');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (22, 4, 'T4', 4, 'Available', 'AC Family Dining');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (23, 4, 'T5', 6, 'Available', 'Bhojanam Thali Section');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (24, 4, 'T6', 8, 'Available', 'Heritage Long Table');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (25, 5, 'T1', 2, 'Available', 'Quick Tiffin Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (26, 5, 'T2', 2, 'Available', 'Quick Tiffin Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (27, 5, 'T3', 4, 'Available', 'Banana Leaf Dine-In');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (28, 5, 'T4', 4, 'Available', 'Banana Leaf Dine-In');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (29, 5, 'T5', 6, 'Available', 'Madurai Family Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (30, 5, 'T6', 8, 'Available', 'Group Dining Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (31, 6, 'T1', 2, 'Available', 'Anna Salai View');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (32, 6, 'T2', 2, 'Available', 'Anna Salai View');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (33, 6, 'T3', 4, 'Available', 'Heritage 1951 Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (34, 6, 'T4', 4, 'Available', 'Heritage 1951 Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (35, 6, 'T5', 6, 'Available', 'Mount Road Mezzanine');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (36, 6, 'T6', 8, 'Available', 'Buhari VIP Chamber');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (37, 7, 'T1', 2, 'Available', 'Chettinad Pillar Booth');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (38, 7, 'T2', 2, 'Available', 'Chettinad Pillar Booth');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (39, 7, 'T3', 4, 'Available', 'Karaikudi Family Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (40, 7, 'T4', 4, 'Available', 'Karaikudi Family Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (41, 7, 'T5', 6, 'Available', 'Aathangudi Courtyard');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (42, 7, 'T6', 8, 'Available', 'Chettiar Grand Suite');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (43, 8, 'T1', 2, 'Available', 'Beach Breeze Deck');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (44, 8, 'T2', 2, 'Available', 'Beach Breeze Deck');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (45, 8, 'T3', 4, 'Available', 'Besant Nagar AC Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (46, 8, 'T4', 4, 'Available', 'Besant Nagar AC Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (47, 8, 'T5', 6, 'Available', 'Family Seating Wing');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (48, 8, 'T6', 8, 'Available', 'Executive VIP Cabin');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (49, 9, 'T1', 2, 'Available', 'Triplicane Heritage Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (50, 9, 'T2', 2, 'Available', 'Triplicane Heritage Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (51, 9, 'T3', 4, 'Available', 'AC Heritage Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (52, 9, 'T4', 4, 'Available', 'AC Heritage Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (53, 9, 'T5', 6, 'Available', 'Brass Bucket Dining');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (54, 9, 'T6', 8, 'Available', 'Grand Family Seating');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (55, 10, 'T1', 2, 'Available', 'Oven View Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (56, 10, 'T2', 2, 'Available', 'Oven View Counter');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (57, 10, 'T3', 4, 'Available', 'Pizzeria Dining Area');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (58, 10, 'T4', 4, 'Available', 'Pizzeria Dining Area');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (59, 10, 'T5', 6, 'Available', 'Family Seating');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (60, 10, 'T6', 8, 'Available', 'Party Lounge');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (61, 11, 'T1', 2, 'Available', 'Window View');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (62, 11, 'T2', 2, 'Available', 'Window View');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (63, 11, 'T3', 4, 'Available', 'Main Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (64, 11, 'T4', 4, 'Available', 'Main Hall');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (65, 11, 'T5', 6, 'Available', 'Patio & Garden');
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES (66, 11, 'T6', 8, 'Available', 'VIP Lounge');

-- Table: table_locks (1 rows)
INSERT INTO table_locks (id, tableId, lockedByUserId, reservationDate, timeSlot, lockExpiresAt, created_at) VALUES (1, 4, 8, '2026-10-06', '21:00', '2026-10-06 04:07:34', '2026-10-06 04:02:34');

-- Table: reservations (6 rows)
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (1, 1, 1, 3, '2026-10-06', '20:00', 4, 'Confirmed', 'Peshawri royal pavilion requested for family anniversary', '2026-10-06 04:02:34');
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (2, 5, 2, 7, '2026-10-06', '19:30', 2, 'Confirmed', 'Bay view window table with flower setup', '2026-10-06 04:02:34');
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (3, 6, 4, 21, '2026-10-06', '13:00', 4, 'Confirmed', 'Traditional South Indian lunch meals', '2026-10-06 04:02:34');
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (4, 7, 6, 35, '2026-10-07', '20:30', 6, 'Confirmed', 'Birthplace of Chicken 65 birthday celebration', '2026-10-06 04:02:34');
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (5, 9, 1, 2, '2026-10-06', '18:00', 2, 'Cancelled', 'Flight delayed, rescheduled to next week', '2026-10-06 04:02:34');
INSERT INTO reservations (id, customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests, created_at) VALUES (6, 1, 1, 1, '2026-10-07', '20:00', 2, 'Confirmed', 'Quiet table please', '2026-10-06 04:02:44');

-- Table: menu_items (67 rows)
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (1, 1, 'Sikandari Raan', 'Frontier slow-roasted whole leg of spring lamb marinated in malt vinegar, cinnamon, and black cumin.', 1450, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (2, 1, 'Murgh Malai Kabab', 'Juicy chicken supreme steeped in royal cream, cheddar, roasted green cardamom, and garlic.', 720, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (3, 1, 'Peshawri Dal Bukhara', 'Whole black lentils slow-simmered for 18 hours on glowing charcoal with plum tomatoes and churned butter.', 580, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (4, 1, 'Grand Chola Dum Mutton Biryani', 'Aged basmati rice infused with Kashmiri saffron, tender goat meat, and fried onions on sealed dum.', 790, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (5, 1, 'Paneer Khurchan', 'Handcrafted fresh cottage cheese tossed on an iron griddle with bell peppers and roasted coriander.', 540, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (6, 1, 'Butter Garlic Naan Basket', 'Assortment of blistered tandoori garlic naans, pudina lachha parathas, and roomali roti.', 180, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (7, 1, 'Kesari Rasmalai & Shahi Phirni', 'Soft cottage cheese dumplings steeped in saffron-cardamom clotted milk, garnished with pistachio slivers.', 290, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (8, 1, 'Artisanal Madras Filter Kaapi Blend', 'Freshly pressed single-origin dark roast Arabica-Chicory decoction frothed with organic full-cream milk.', 160, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (9, 2, 'Lobster Nerulli', 'Fresh Bay of Bengal lobster tail sautéed in shallots, coconut milk reduction, and crushed Tellicherry black pepper.', 1650, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (10, 2, 'Dakshin Kozhi Roast', 'Tender country chicken chunks dry-roasted on cast iron with curry leaves, stone-ground chilies and coconut slivers.', 680, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (11, 2, 'Malabar Meen Pollichathu', 'Seer fish steak smothered in spiced shallot-ginger masala, wrapped in charred banana leaf and slow-cooked.', 850, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (12, 2, 'Jamavar Murgh Butter Masala', 'Charcoal-grilled chicken tikka in a silky makhani gravy infused with kasuri methi and wild mountain honey.', 720, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (13, 2, 'Urulai Roast & Chettinad Paneer', 'Baby potatoes and cottage cheese cubes simmered in freshly crushed star anise and roasted coconut gravy.', 520, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (14, 2, 'Malabar Golden Parotta (3 Pcs)', 'Layered spiral flaky flatbreads griddled with pure clarified cow butter.', 150, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (15, 2, 'Elaneer (Tender Coconut) Payasam', 'Decadent chilled South Indian kheer prepared with tender coconut water, jelly, and cardamom condensed milk.', 280, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (16, 3, 'Madurai Kari Dosai', 'Traditional thick stone-griddle dosai layered with spicy minced mutton sukka and beaten farm egg.', 590, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (17, 3, 'Asparagus Coconut Melagu', 'Tender baby asparagus braised in coconut cream and tempered with crushed black peppercorns and curry leaves.', 480, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (18, 3, 'Alleppey Seer Fish Curry', 'Fresh seer fish steaks simmered in tangy raw mango gravy, fresh coconut milk and ginger batons.', 750, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (19, 3, 'Chettinad Kozhi Kuzhambu', 'Country chicken simmered in traditional 18-spice stone ground Chettinad masala with kalpasi and fennel.', 650, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (20, 3, 'Fresh Hot Appams (3 Pcs)', 'Bowl-shaped crispy lacy fermented rice hoppers served with sweet freshly pressed first coconut milk.', 160, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (21, 3, 'Ada Pradhaman', 'Traditional Kerala dessert crafted with steamed rice ribbons, jaggery syrup, coconut chips, and ghee.', 260, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (22, 4, 'Special Ghee Roast Masala Dosa', 'Signature paper-crisp golden dosa roasted with fragrant cow ghee and stuffed with potato-onion masala, served with 3 chutneys & sambar.', 140, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (23, 4, 'Mini Ghee Podi Idli (14 Pcs)', 'Bite-sized button idlis tossed in spicy gunpowder idli podi and melted hot ghee, served with piping hot drumstick sambar.', 120, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (24, 4, 'Crispy Medu Vada (2 Pcs)', 'Golden fried lentil donuts crisp on the outside, fluffy inside, served with fresh coconut chutney and sambar.', 75, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (25, 4, 'Saravana Special South Indian Thali Meals', 'Complete royal feast: Steamed Ponni rice, Sambar, Pepper Rasam, Vatha Kuzhambu, Kootu, Poriyal, Curd, Appalam, Pickle, and Sweet Payasam.', 210, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (26, 4, 'Ghee Rava Khichdi with Cashews', 'Roasted semolina cooked with ghee, carrots, green peas, and roasted cashews, served with coconut chutney.', 95, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (27, 4, 'Saravana Pure Ghee Badam Halwa', 'Rich almond confection prepared with peeled almonds, sugar, saffron strands and pure ghee.', 130, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (28, 4, 'Iconic Madras Filter Coffee', 'Freshly brewed strong chicory filter coffee served hot in traditional brass davarah and tumbler.', 50, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (29, 5, 'Mallipoo Ghee Podi Idli (3 Pcs)', 'Jasmine-soft steaming idlis smothered in fiery Madurai gunpowder and cold-pressed sesame oil.', 110, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (30, 5, '4-Chutney Tasting Platter', 'The famed Murugan quartet: White Coconut, Spicy Red Tomato, Coriander Mint, and Onion Kara Chutney.', 60, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (31, 5, 'Ghee Onion Podi Uttapam', 'Thick fermented rice pancake generously topped with caramelized shallots, podi, and cow ghee.', 135, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (32, 5, 'Ghee Paper Roast Dosa', 'Extra thin cone-rolled golden crepe roasted with pure ghee, served with four signature chutneys.', 150, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (33, 5, 'Madurai Special Jigarthanda', 'Famous Madurai cooling dessert drink made of badam pisin (almond gum), condensed milk, nannari syrup and basundi ice cream.', 110, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (34, 5, 'Traditional Filter Kaapi', 'Aromatic Kumbakonam style degree filter coffee brewed fresh to order.', 50, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (35, 6, 'Original Buhari Chicken 65', 'The world-famous dish created in 1965 by A.M. Buhari: succulent boneless chicken deep-fried and tossed with curry leaves, curd, and secret red spices.', 320, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (36, 6, 'Buhari Mutton Chukka Varuval', 'Tender baby goat cuts slow-roasted dry on an iron kadai with caramelized onions and freshly crushed pepper.', 390, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (37, 6, 'Buhari Special Mutton Dum Biryani', 'Historic Chennai deg-cooked basmati mutton dum biryani served with spicy brinjal dalcha, onion pachadi, and boiled egg.', 380, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (38, 6, 'Buhari Chicken Dum Biryani', 'Aromatic long-grain basmati cooked with bone-in tender chicken and whole spices on charcoal dum.', 310, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (39, 6, 'Ceylon Egg Veechu Parotta', 'Wafer-thin tossed parotta stuffed with a savory layer of whisked eggs, onions, and ground spices.', 120, 'Breads & Rice', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (40, 6, 'Buhari Royal Falooda', 'Classic Mount Road falooda loaded with rose syrup, sabja seeds, falooda sev, dried nuts, and vanilla ice cream scoop.', 170, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (41, 7, 'Chettinad Crab Pepper Fry', 'Fresh blue swimmer mud crabs tossed in roasted tellicherry black pepper, shallots, garlic, and curry leaves.', 480, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (42, 7, 'Nattu Kozhi Varuval', 'Country chicken sautéed dry with roasted Karaikudi stone-ground spices and curry leaves.', 360, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (43, 7, 'Anjappar Special Kozhi Biryani', 'Fragrant seeraga samba small-grain rice cooked with succulent country chicken and Chettinad spices.', 320, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (44, 7, 'Chettinad Mutton Chops Masala', 'Succulent lamb chops braised slow in thick pepper, onion and tomato gravy.', 420, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (45, 7, 'Layered Veechu Parotta (2 Pcs)', 'Crisp airy parottas spun and slapped onto a hot iron tawa with ghee.', 90, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (46, 7, 'Chettinad Elaneer Payasam', 'Creamy tender coconut pulp simmered with fresh milk and roasted cashews.', 140, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (47, 8, 'Thalappakatti Mutton Biriyani', 'The iconic 1957 recipe cooked with short-grain seeraga samba rice, tender hill country mutton and pure ghee.', 395, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (48, 8, 'Thalappakatti Chicken Chukka', 'Boneless chicken morsels dry fried with Dindigul special hand-ground masala and shallots.', 310, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (49, 8, 'Pepper Fried Egg (3 Pcs)', 'Hard boiled eggs pan-tossed in pepper powder, curry leaves and ground cumin.', 150, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (50, 8, 'Enna Kathirikai Kuzhambu', 'Small stuffed brinjals cooked in sesame paste and tamarind gravy, traditional pairing with biryani.', 220, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (51, 8, 'Coin Parotta (4 Pcs)', 'Flaky mini coin parottas cooked on flat iron tawa with clarified butter.', 110, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (52, 8, 'Chilled Special Rose Milk', 'Refreshing thick milk infused with natural rose petal essence, a Chennai favorite.', 80, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (53, 9, 'Legendary Sambhar Idli (2 Pcs)', 'Duo of soft steaming idlis submerged completely in an overflowing bowl of Ratna Cafe’s piping hot signature brass-bucket sambar.', 85, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (54, 9, 'Crispy Sambhar Vadai', 'Crisp urad dal vada drenched in boiling sambar with fresh coriander and ghee drizzle.', 75, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (55, 9, 'Triplicane Ghee Masala Dosa', 'Crispy golden griddle dosa smeared with potato masala, roasted in pure cow ghee.', 120, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (56, 9, 'Puffy Poori Masala (2 Pcs)', 'Whole wheat fluffy puffed pooris served with lightly spiced potato-onion gravy.', 90, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (57, 9, 'Ghee Dripping Badam Halwa', 'Warm almond pudding made in pure ghee every morning, melt-in-the-mouth texture.', 110, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (58, 9, 'Ratna Cafe Degree Filter Coffee', 'Fresh decoction brewed with full-cream hot milk, served in brass tumbler.', 40, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (59, 10, 'Cheesy Garlic Pull-Apart Bread', 'Warm sourdough loaf baked with roasted garlic butter, parsley, and molten cheddar.', 240, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (60, 10, 'Artisan Margherita Woodfire Pizza', 'San Marzano Italian tomato sauce, fresh buffalo mozzarella, aromatic basil, and olive oil.', 490, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (61, 10, 'Spicy Pepperoni & Hot Honey Pizza', 'Italian pepperoni slices, pickled jalapenos, hot honey drizzle, and fresh mozzarella.', 590, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (62, 10, 'Tiramisu Classico', 'Savoiardi ladyfingers soaked in espresso coffee and layered with whipped mascarpone cream.', 220, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (63, 11, 'Old Delhi Butter Chicken', 'Slow-simmered shredded tandoori chicken in a rich tomato, butter, and dried fenugreek gravy.', 450, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (64, 11, 'Paneer Tikka Angaare', 'Fresh cottage cheese marinated in spiced hung curd, charred to perfection in tandoor.', 320, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (65, 11, 'Dum Pukht Lucknowi Biryani', 'Aged basmati rice slow-cooked on dum with aromatic whole spices, served with raita.', 420, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (66, 11, 'Butter Garlic Naan', 'Crisp tandoor-baked leavened bread brushed generously with garlic butter and fresh cilantro.', 90, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80');
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES (67, 11, 'Alphonso Mango Lassi', 'Chilled creamy yogurt smoothie blended with ripe Ratnagiri Alphonso mango puree.', 140, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80');

-- Table: orders (6 rows)
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (1, 1, 1, 'Dine-In', 3, '', 2320, 'Preparing', '2026-10-06 04:02:34');
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (2, 1, 6, 'Delivery', NULL, 'Flat 4B, Ceebros Heritage, Nungambakkam High Road, Chennai', 700, 'Out for Delivery', '2026-10-06 04:02:34');
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (3, 5, 4, 'Delivery', NULL, '15, 2nd Main Road, Gandhinagar, Adyar, Chennai', 310, 'Delivered', '2026-10-06 04:02:34');
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (4, 6, 2, 'Dine-In', 7, '', 2500, 'Served', '2026-10-06 04:02:34');
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (5, 7, 1, 'Delivery', NULL, 'Tower 2, Olympia Opaline, OMR, Navalur, Chennai', 420, 'Pending', '2026-10-06 04:02:34');
INSERT INTO orders (id, customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus, created_at) VALUES (6, 1, 1, 'Dine-In', 1, '', 820, 'Preparing', '2026-10-06 04:02:44');

-- Table: order_items (13 rows)
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (1, 1, 1, 'Sikandari Raan', 1450, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (2, 1, 3, 'Peshawri Dal Bukhara', 580, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (3, 1, 7, 'Kesari Rasmalai & Shahi Phirni', 290, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (4, 2, 35, 'Original Buhari Chicken 65', 320, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (5, 2, 37, 'Buhari Special Mutton Dum Biryani', 380, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (6, 3, 22, 'Special Ghee Roast Masala Dosa', 140, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (7, 3, 23, 'Mini Ghee Podi Idli (14 Pcs)', 120, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (8, 3, 28, 'Iconic Madras Filter Coffee', 50, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (9, 4, 9, 'Lobster Nerulli', 1650, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (10, 4, 11, 'Malabar Meen Pollichathu', 850, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (11, 5, 3, 'Peshawri Dal Bukhara', 580, 1);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (12, 6, 1, 'Paneer Tikka Angaare', 320, 2);
INSERT INTO order_items (id, orderId, menuItemId, name, price, quantity) VALUES (13, 6, 8, 'Butter Garlic Naan', 90, 2);

-- Table: payments (6 rows)
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (1, 1, 'pay_rzp_itc_live_901', 'order_rzp_itc_101', 'sig_test_verified', 2320, 'Success', '2026-10-06 04:02:34');
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (2, 2, 'pay_rzp_buhari_902', 'order_rzp_buhari_102', 'sig_test_verified', 700, 'Success', '2026-10-06 04:02:34');
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (3, 3, 'pay_rzp_hsb_903', 'order_rzp_hsb_103', 'sig_test_verified', 310, 'Success', '2026-10-06 04:02:34');
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (4, 4, 'pay_rzp_leela_904', 'order_rzp_leela_104', 'sig_test_verified', 2500, 'Success', '2026-10-06 04:02:34');
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (5, 5, NULL, NULL, NULL, 580, 'Pending', '2026-10-06 04:02:34');
INSERT INTO payments (id, orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus, created_at) VALUES (6, 6, 'pay_test_live_verify_7712', 'order_1791259364068_260', 'sig_test_verified', 820, 'Success', '2026-10-06 04:02:44');

-- Table: reviews (6 rows)
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (1, 1, 1, 5, 'The Sikandari Raan and Dal Bukhara at Peshawri are unparalleled in South India. The royal ambience in Guindy is world-class.', 0, 0, '2026-10-06 04:02:34');
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (2, 5, 2, 5, 'Spectacular Bay of Bengal ocean view dining! The Lobster Nerulli and Tender Coconut Payasam were divine.', 0, 0, '2026-10-06 04:02:34');
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (3, 6, 6, 5, 'Nothing beats eating the original Chicken 65 at the birthplace where it was created in 1965! Mutton Dum Biryani was sensational.', 0, 0, '2026-10-06 04:02:34');
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (4, 7, 4, 5, 'Crispy Ghee Roast Dosa and hot mini podi idlis are unmatched. Best degree filter coffee in Chennai.', 0, 0, '2026-10-06 04:02:34');
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (5, 8, 9, 5, 'The famous brass bucket sambar poured hot over the idlis and vadai is legendary. Authentic Triplicane heritage!', 0, 0, '2026-10-06 04:02:34');
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden, created_at) VALUES (6, 9, 1, 1, 'CLAIM FREE ₹10000 FOOD COUPONS NOW ON: scam-free-food-chennai.online CLICK HERE', 1, 0, '2026-10-06 04:02:34');

-- Table: audit_logs (7 rows)
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (1, 3, 'SYSTEM_INIT', 'FeastHub engine seeded with real Chennai luxury hotels and legendary eateries', '2026-10-06 04:02:34');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (2, 1, 'TABLE_RESERVED', 'Rahul booked Table T3 at ITC Grand Chola for 20:00', '2026-10-06 04:02:34');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (3, 8, 'TABLE_LOCK_ACQUIRED', 'Arjun locked Table T4 at ITC Grand Chola (5-min hold guard active)', '2026-10-06 04:02:34');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (4, 1, 'TABLE_RESERVED', 'Booked table T1 on 2026-10-07 at 20:00', '2026-10-06 04:02:44');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (5, 1, 'ORDER_CREATED', 'Placed Dine-In order #6 with total ₹820', '2026-10-06 04:02:44');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (6, 1, 'PAYMENT_VERIFIED', 'HMAC-SHA256 payment verified for order #6 (Razorpay ID: pay_test_live_verify_7712)', '2026-10-06 04:02:44');
INSERT INTO audit_logs (id, userId, action, details, timestamp) VALUES (7, 2, 'ORDER_STATUS_UPDATED', 'Order #6 status changed to Preparing', '2026-10-06 04:02:44');

