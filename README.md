# FeastHub — Online Food Delivery & Live Table Reservation Engine

A full-stack, Swiggy & Zomato style food-tech platform integrating **online doorstep food delivery** with **real-time live restaurant table reservations** (featuring dynamic 5-minute atomic lock guards to eliminate double-booking).

Built on the **MERN architecture using Cloudflare D1 / SQLite** as the relational SQL database, **Socket.IO** for live bidirectional event synchronization, and **Razorpay API** with server-side **HMAC-SHA256** cryptographic signature verification.

```
+-------------------------------------------------------------+
|               React.js Frontend (Vite + SPA)                |
|  - Consumer Food-Tech UI (Delivery vs Dining Out Tabs)      |
|  - Chennai Region & Locality Switcher (Guindy, T. Nagar)    |
|  - Real-Time Table Seating Map & Concurrency Lock Countdown |
+------------------------------+------------------------------+
                               | (REST API + WebSockets)
                               v
+-------------------------------------------------------------+
|              Node.js + Express.js REST API Server           |
|  - JWT Stateless Authentication & RBAC Middleware           |
|  - 5-Minute Atomic Concurrency Table Lock Guard             |
|  - Kitchen Pipeline Manager & Razorpay HMAC Verifier        |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|          Cloudflare D1 / SQLite Database Engine             |
|  - Relational Schema with Foreign Keys & ACID Transactions   |
|  - Tables, Reservations, Menu, Orders, Payments, Audit Logs |
+-------------------------------------------------------------+
```

---

## 🌟 Real Chennai Hotels & Fine Dining Lineup

FeastHub features authentic, world-famous luxury hotels and legendary eateries across Chennai:

1. **ITC Grand Chola — The Madras Pavilion & Peshawri** (Guindy, Chennai)  
   *Frontier Kebabs, Mughlai, Dal Bukhara, Sikandari Raan, Royal South Indian Buffet (₹2,400 for two)*
2. **The Leela Palace — Jamavar** (MRC Nagar, Raja Annamalaipuram, Chennai)  
   *Royal Awadhi, Coastal Seafood, Lobster Nerulli, Bay of Bengal Ocean View Dining (₹2,800 for two)*
3. **Taj Coromandel — Southern Spice** (Nungambakkam, Chennai)  
   *Temple-Heritage South Indian, Madurai Kari Dosai, Asparagus Coconut Melagu, Kozhi Kuzhambu (₹2,200 for two)*
4. **Hotel Saravana Bhavan (Original Since 1981)** (Kennet Lane, Egmore / T. Nagar, Chennai)  
   *Global vegetarian icon: Ghee Roast Dosa, Mini Ghee Podi Idli, Traditional South Indian Meals, Filter Kaapi (₹350 for two)*
5. **Murugan Idli Shop** (G.N. Chetty Road, T. Nagar, Chennai)  
   *Jasmine-soft Mallipoo Podi Idli, 4-Chutney Tasting Platter, Ghee Onion Uttapam, Madurai Jigarthanda (₹300 for two)*
6. **Buhari Hotel (Est. 1951 — Birthplace of Chicken 65)** (Mount Road / Anna Salai, Chennai)  
   *The authentic 1965 original Chicken 65 recipe, Buhari Special Mutton Dum Biryani, Ceylon Egg Parotta (₹650 for two)*
7. **Anjappar Chettinad Restaurant** (Nungambakkam, Chennai)  
   *Fiery Karaikudi Chettinad Biryani, Crab Pepper Fry, Nattu Kozhi Varuval, Veechu Parotta (₹700 for two)*
8. **Dindigul Thalappakatti Biriyani** (Besant Nagar Beach, Chennai)  
   *Original 1957 Seeraga Samba Mutton Biriyani, Thalappakatti Chicken Chukka, Gunpowder Egg Roast (₹600 for two)*
9. **Ratna Cafe (Est. 1948)** (Triplicane High Road, Chennai)  
   *Triplicane heritage: Piping-hot brass-bucket Sambar Idli, Crispy Sambhar Vadai, Degree Filter Kaapi (₹250 for two)*
10. **Urban Woodfire Pizzeria** (T. Nagar, Chennai)  
    *Artisan Margherita, Spicy Pepperoni with Hot Honey, Cheesy Garlic Sourdough Bread (₹550 for two)*
11. **The Royal Spice Kitchen** (Indiranagar, Bengaluru)  
    *Old Delhi Butter Chicken, Dum Pukht Lucknowi Biryani, Garlic Naan (₹700 for two)*

---

## 🌟 Key Features

### 1. Swiggy & Zomato Style Consumer Discovery
- **City & Locality Filter**: Filter seamlessly across **Chennai (Namma Ooru)**, **Bengaluru**, and individual Chennai localities (Guindy, MRC Nagar, T. Nagar, Mount Road, Triplicane, Besant Nagar).
- **Dual Mode Switcher**: Toggle between **Delivery** (food ordering) and **Dining Out** (table reservation).
- **Cuisine Carousel**: Quick access to Biryani, Chicken 65, Podi Idli & Dosa, Royal Buffets, Coastal Seafood, Filter Coffee.
- **Restaurant Listings**: Displaying cuisine, rating badges (`4.9 ★`), delivery time (`20-25 mins`), cost for two, and promotional discount badges (`20% OFF UP TO ₹300`).
- **Interactive Menu**: Dish catalog with Veg/Non-Veg indicators, high-resolution imagery, and dynamic cart with 5% GST calculations.

### 2. Live Dining Table Reservations (Zomato Dining / Dineout Style)
- Real-time interactive floor plan grid (`T1` to `T6`) displaying dynamic capacities (2, 4, 6, 8 pax), table zones, and occupancy.
- **5-Minute Temporary Lock Guard**: When a customer selects an available table slot, the engine locks the table in D1 for 5 minutes (`CURRENT_TIMESTAMP + 5 minutes`).
- Any concurrent booking attempt by another customer immediately returns **`409 Conflict`**, preventing race conditions and double-booking.
- Real-time updates pushed instantly to all viewing clients via **Socket.IO**.

### 3. Kitchen Partner Kanban & Live Order Tracker
- Restaurant staff dashboard with status progression: `Pending` → `Preparing` → `Out for Delivery / Served` → `Delivered`.
- Live customer order tracker with visual status progress bar powered by persistent WebSockets.

### 4. Payment Gateway & HMAC-SHA256 Verification
- Razorpay order intent generation with currency and paisa conversion.
- Backend cryptographic **HMAC-SHA256** signature verification ensuring zero transaction tampering.
- Sandbox / demo mode supported out of the box.

### 5. Multi-Role Management
- **Customer**: Food ordering, table reservations, live tracking, dining reviews.
- **Restaurant Staff / Kitchen Partner**: Kitchen pipeline status progression, table occupancy manager, menu inventory toggle.
- **Platform Admin**: Revenue analytics, restaurant onboarding/approvals, global user management, audit logs.
- **Content Moderator**: Review moderation queue, hide or delete spam/inappropriate content.

---

## 🛠️ Quick Start & Execution

### 1. Seed Database
```bash
# Seed the D1 / SQLite database with Chennai hotels, tables, menus, users, and orders
npm run seed
```

### 2. Build Frontend Client
```bash
npm run build
```

### 3. Run Application
```bash
# Start full-stack server (serves API, Socket.IO, and built UI at http://localhost:5000)
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

Alternatively, for concurrent development:
```bash
npm run dev
```
(Frontend at `http://localhost:3000`, Backend at `http://localhost:5000`).

---

## 📋 Demo User Credentials

All accounts share the default password: **`password123`**

| Role | Name | Email | Quick Switch |
|---|---|---|---|
| **Customer** | Rahul Sharma | `customer@demo.com` | Top Nav Strip |
| **Customer** | Sebastian | `sebastian@demo.com` | Top Nav Strip |
| **Customer** | Tashu | `tashu@demo.com` | Top Nav Strip |
| **Kitchen Staff** | Chef Rajesh | `staff@demo.com` | Top Nav Strip |
| **Platform Admin** | Platform Admin | `admin@demo.com` | Top Nav Strip |
| **Moderator** | Trust & Safety Lead | `moderator@demo.com` | Top Nav Strip |
