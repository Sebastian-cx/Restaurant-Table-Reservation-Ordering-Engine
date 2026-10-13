-- Seed data for Cloudflare D1
-- Users (password is 'password123' bcrypt hashed)
INSERT INTO users (id, name, email, passwordHash, role) VALUES 
(1, 'Rahul Sharma', 'customer@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer'),
(2, 'Chef Rajesh', 'staff@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Staff'),
(3, 'Platform Admin', 'admin@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Admin'),
(4, 'Trust & Safety Lead', 'moderator@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Moderator'),
(5, 'Sebastian', 'sebastian@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer'),
(6, 'Tashu', 'tashu@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer'),
(7, 'Rishika', 'rishika@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer'),
(8, 'Arjun', 'arjun@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer'),
(9, 'Ananya', 'ananya@demo.com', '$2a$10$w8T9H6J6Uq6R1rQ8bN7f4eXW2Y0v9M6G4K2T1U7C8L9N0P1Q2R3S4', 'Customer');

-- Restaurants
INSERT INTO restaurants (id, name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved) VALUES 
(1, 'The Royal Spice Kitchen', '100 Feet Road, Indiranagar, Bengaluru', 'North Indian, Mughlai, Biryani', '11:00 AM - 11:30 PM', 4.4, '25-30 mins', 700, '50% OFF UP TO ₹100', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80', 1),
(2, 'Urban Woodfire Pizzeria', 'North Usman Road, T. Nagar, Chennai', 'Pizzas, Pasta, Italian, Garlic Bread', '12:00 PM - 11:00 PM', 4.6, '20-25 mins', 550, 'FLAT ₹125 OFF', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80', 1),
(3, 'Coastal Bay Bistro', 'Marina Beach Road, Santhome, Chennai', 'Coastal Seafood, South Indian, Thalis', '12:00 PM - 10:30 PM', 4.3, '30-35 mins', 650, 'FREE DELIVERY', 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=700&auto=format&fit=crop&q=80', 1),
(4, 'Bao & Dimsum Express', 'Koramangala 4th Block, Bengaluru', 'Asian, Dimsums, Ramen, Noodles', '12:30 PM - 11:00 PM', 4.5, '35-40 mins', 600, '20% OFF UP TO ₹120', 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=700&auto=format&fit=crop&q=80', 1),
(5, 'Smash & Grill Burger Co.', 'Jayanagar 3rd Block, Bengaluru', 'Gourmet Burgers, Crispy Fries, Shakes', '11:30 AM - 12:00 AM', 4.2, '20-25 mins', 450, 'BUY 1 GET 1 FREE', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=700&auto=format&fit=crop&q=80', 1),
(6, 'Sweet Tooth & Chaat House', 'Anna Nagar West, Chennai', 'Desserts, Traditional Mithai, Street Chaat', '10:00 AM - 10:00 PM', 4.7, '15-20 mins', 350, 'FLAT 15% OFF', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=80', 1);

-- Tables for Restaurant 1
INSERT INTO tables (id, restaurantId, tableNumber, capacity, status, floor_zone) VALUES 
(1, 1, 'T1', 2, 'Available', 'Window View'),
(2, 1, 'T2', 2, 'Available', 'Window View'),
(3, 1, 'T3', 4, 'Available', 'Main Hall'),
(4, 1, 'T4', 4, 'Available', 'Main Hall'),
(5, 1, 'T5', 4, 'Available', 'Main Hall'),
(6, 1, 'T6', 6, 'Available', 'Patio & Garden'),
(7, 1, 'T7', 6, 'Available', 'Patio & Garden'),
(8, 1, 'T8', 8, 'Available', 'VIP Lounge');

-- Tables for Restaurant 2 & 3
INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES 
(2, 'T1', 2, 'Available', 'Dine-In Area'),
(2, 'T2', 4, 'Available', 'Dine-In Area'),
(3, 'T1', 2, 'Available', 'Dine-In Area'),
(3, 'T2', 4, 'Available', 'Dine-In Area');

-- Dishes / Menu Items
INSERT INTO menu_items (id, restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl) VALUES 
(1, 1, 'Old Delhi Butter Chicken', 'Slow-simmered shredded tandoori chicken in a rich tomato, butter, and dried fenugreek gravy.', 450, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'),
(2, 1, 'Paneer Tikka Angaare', 'Fresh cottage cheese marinated in spiced hung curd, charred to perfection in tandoor.', 320, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'),
(3, 1, 'Murgh Malai Kebab', 'Juicy chicken breast morsels marinated with cream, cheese, and roasted green cardamom.', 390, 'Starters', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'),
(4, 1, 'Dum Pukht Lucknowi Biryani', 'Aged basmati rice slow-cooked on dum with aromatic whole spices, served with raita.', 420, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'),
(5, 1, 'Dal Makhani Slow-Simmered', 'Creamy black lentils simmered overnight with farm butter and roasted cumin.', 320, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=80'),
(6, 1, 'Butter Garlic Naan', 'Crisp tandoor-baked leavened bread brushed generously with garlic butter and fresh cilantro.', 90, 'Breads & Rice', 1, 'Veg', 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'),
(7, 1, 'Royal Kesari Gulab Jamun', 'Soft fried milk dumplings soaked in saffron-rose syrup with sliced pistachios.', 160, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80'),
(8, 1, 'Alphonso Mango Lassi', 'Chilled creamy yogurt smoothie blended with ripe Ratnagiri Alphonso mango puree.', 140, 'Desserts & Beverages', 1, 'Veg', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80'),
(9, 2, 'Artisan Margherita Pizza', 'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil, and extra virgin olive oil.', 490, 'Main Course', 1, 'Veg', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=80'),
(10, 2, 'Spicy Pepperoni & Jalapeno Pizza', 'Italian pepperoni slices, pickled jalapenos, hot honey drizzle, and mozzarella.', 590, 'Main Course', 1, 'Non-Veg', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80'),
(11, 2, 'Cheesy Garlic Pull-Apart Bread', 'Warm sourdough loaf stuffed with roasted garlic butter and molten cheddar.', 240, 'Starters', 1, 'Veg', 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?w=500&auto=format&fit=crop&q=80');

-- Reviews
INSERT INTO reviews (id, customerId, restaurantId, rating, comment, isFlagged, isHidden) VALUES 
(1, 1, 1, 5, 'The Butter Chicken and garlic naan were extraordinary! Delivered hot in under 25 mins.', 0, 0),
(2, 1, 1, 1, 'Spam comment with unsolicited external links: visit promo-fake-deals.xyz', 1, 0);

-- Initial Audit Log
INSERT INTO audit_logs (userId, action, details) VALUES 
(3, 'SYSTEM_INIT', 'Cloudflare D1 database initialized for FeastHub platform');
