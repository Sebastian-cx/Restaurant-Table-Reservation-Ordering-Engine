const bcrypt = require('bcryptjs');
const db = require('./index');

console.log('Seeding FeastHub database with authentic Chennai hotels, fine-dining restaurants, and full menus...');

// 1. Clear existing test data and reset autoincrement counters
db.exec(`
  DELETE FROM audit_logs;
  DELETE FROM reviews;
  DELETE FROM payments;
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM reservations;
  DELETE FROM table_locks;
  DELETE FROM menu_items;
  DELETE FROM tables;
  DELETE FROM restaurants;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

// 2. Seed Users across all 4 roles
const salt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync('password123', salt);

const users = [
  { name: 'Rahul Sharma', email: 'customer@demo.com', role: 'Customer' },
  { name: 'Chef Rajesh (Kitchen Partner)', email: 'staff@demo.com', role: 'Staff' },
  { name: 'Platform Admin', email: 'admin@demo.com', role: 'Admin' },
  { name: 'Trust & Safety Lead', email: 'moderator@demo.com', role: 'Moderator' }
];

const userIds = {};
for (const u of users) {
  const res = db.run('INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)', [
    u.name,
    u.email,
    defaultPasswordHash,
    u.role
  ]);
  userIds[u.role] = Number(res.lastInsertRowid);
}
console.log('✔ Users seeded (Customer, Staff, Admin, Moderator)');

// 2b. Seed Extra Customers for Socket.IO & Concurrency Testing
const dummyCustomers = [
  { name: 'Sebastian',  email: 'sebastian@demo.com' },
  { name: 'Tashu',      email: 'tashu@demo.com'     },
  { name: 'Rishika',    email: 'rishika@demo.com'   },
  { name: 'Arjun',      email: 'arjun@demo.com'     },
  { name: 'Ananya',     email: 'ananya@demo.com'    }
];

const dummyCustomerIds = [];
for (const dc of dummyCustomers) {
  const res = db.run('INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)', [
    dc.name,
    dc.email,
    defaultPasswordHash,
    'Customer'
  ]);
  dummyCustomerIds.push(Number(res.lastInsertRowid));
}
console.log('✔ 5 Test customers seeded (Sebastian, Tashu, Rishika, Arjun, Ananya) — password: password123');

// 3. Seed Real Iconic Hotels and Restaurants from Chennai & Bengaluru
const restaurants = [
  {
    name: 'ITC Grand Chola — The Madras Pavilion & Peshawri',
    address: '63, Anna Salai, Little Mount, Guindy, Chennai',
    cuisine: 'Frontier Kebabs, Mughlai, Royal South Indian Buffet',
    openingHours: '12:30 PM - 11:30 PM',
    rating: 4.9,
    deliveryTime: '35-40 mins',
    costForTwo: 2400,
    offerText: '20% OFF UP TO ₹300',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Chola Dynasty Atrium' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Chola Dynasty Atrium' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Peshawri Royal Pavilion' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Peshawri Royal Pavilion' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Imperial Dining Hall' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Emperor VIP Lounge' }
    ],
    menu: [
      {
        name: 'Sikandari Raan',
        category: 'Starters',
        description: 'Frontier slow-roasted whole leg of spring lamb marinated in malt vinegar, cinnamon, and black cumin.',
        price: 1450,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Murgh Malai Kabab',
        category: 'Starters',
        description: 'Juicy chicken supreme steeped in royal cream, cheddar, roasted green cardamom, and garlic.',
        price: 720,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Peshawri Dal Bukhara',
        category: 'Main Course',
        description: 'Whole black lentils slow-simmered for 18 hours on glowing charcoal with plum tomatoes and churned butter.',
        price: 580,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Grand Chola Dum Mutton Biryani',
        category: 'Main Course',
        description: 'Aged basmati rice infused with Kashmiri saffron, tender goat meat, and fried onions on sealed dum.',
        price: 790,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Paneer Khurchan',
        category: 'Main Course',
        description: 'Handcrafted fresh cottage cheese tossed on an iron griddle with bell peppers and roasted coriander.',
        price: 540,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Butter Garlic Naan Basket',
        category: 'Breads & Rice',
        description: 'Assortment of blistered tandoori garlic naans, pudina lachha parathas, and roomali roti.',
        price: 180,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Kesari Rasmalai & Shahi Phirni',
        category: 'Desserts & Beverages',
        description: 'Soft cottage cheese dumplings steeped in saffron-cardamom clotted milk, garnished with pistachio slivers.',
        price: 290,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Artisanal Madras Filter Kaapi Blend',
        category: 'Desserts & Beverages',
        description: 'Freshly pressed single-origin dark roast Arabica-Chicory decoction frothed with organic full-cream milk.',
        price: 160,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'The Leela Palace — Jamavar',
    address: 'Adyar Seaface, MRC Nagar, Raja Annamalaipuram, Chennai',
    cuisine: 'Royal Awadhi, Coastal Seafood, Gourmet South Indian',
    openingHours: '12:00 PM - 11:00 PM',
    rating: 4.9,
    deliveryTime: '40-45 mins',
    costForTwo: 2800,
    offerText: 'FLAT ₹250 OFF ON LUXURY DINING',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Bay View Window Alcove' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Bay View Window Alcove' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Maharaja Dining Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Maharaja Dining Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Lotus Sea Courtyard' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Palace Royal Suite' }
    ],
    menu: [
      {
        name: 'Lobster Nerulli',
        category: 'Starters',
        description: 'Fresh Bay of Bengal lobster tail sautéed in shallots, coconut milk reduction, and crushed Tellicherry black pepper.',
        price: 1650,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Dakshin Kozhi Roast',
        category: 'Starters',
        description: 'Tender country chicken chunks dry-roasted on cast iron with curry leaves, stone-ground chilies and coconut slivers.',
        price: 680,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Malabar Meen Pollichathu',
        category: 'Main Course',
        description: 'Seer fish steak smothered in spiced shallot-ginger masala, wrapped in charred banana leaf and slow-cooked.',
        price: 850,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Jamavar Murgh Butter Masala',
        category: 'Main Course',
        description: 'Charcoal-grilled chicken tikka in a silky makhani gravy infused with kasuri methi and wild mountain honey.',
        price: 720,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Urulai Roast & Chettinad Paneer',
        category: 'Main Course',
        description: 'Baby potatoes and cottage cheese cubes simmered in freshly crushed star anise and roasted coconut gravy.',
        price: 520,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Malabar Golden Parotta (3 Pcs)',
        category: 'Breads & Rice',
        description: 'Layered spiral flaky flatbreads griddled with pure clarified cow butter.',
        price: 150,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Elaneer (Tender Coconut) Payasam',
        category: 'Desserts & Beverages',
        description: 'Decadent chilled South Indian kheer prepared with tender coconut water, jelly, and cardamom condensed milk.',
        price: 280,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Taj Coromandel — Southern Spice',
    address: '37, Mahatma Gandhi Road, Nungambakkam, Chennai',
    cuisine: 'Heritage South Indian, Chettinad, Kerala & Mangalorean',
    openingHours: '12:30 PM - 11:00 PM',
    rating: 4.8,
    deliveryTime: '30-35 mins',
    costForTwo: 2200,
    offerText: 'CHEF TASTING MENU 15% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Temple Carving Alcove' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Temple Carving Alcove' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Lotus Sanctum Dining' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Lotus Sanctum Dining' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Coromandel Verandah' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Private Coromandel Suite' }
    ],
    menu: [
      {
        name: 'Madurai Kari Dosai',
        category: 'Starters',
        description: 'Traditional thick stone-griddle dosai layered with spicy minced mutton sukka and beaten farm egg.',
        price: 590,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Asparagus Coconut Melagu',
        category: 'Starters',
        description: 'Tender baby asparagus braised in coconut cream and tempered with crushed black peppercorns and curry leaves.',
        price: 480,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Alleppey Seer Fish Curry',
        category: 'Main Course',
        description: 'Fresh seer fish steaks simmered in tangy raw mango gravy, fresh coconut milk and ginger batons.',
        price: 750,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chettinad Kozhi Kuzhambu',
        category: 'Main Course',
        description: 'Country chicken simmered in traditional 18-spice stone ground Chettinad masala with kalpasi and fennel.',
        price: 650,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fresh Hot Appams (3 Pcs)',
        category: 'Breads & Rice',
        description: 'Bowl-shaped crispy lacy fermented rice hoppers served with sweet freshly pressed first coconut milk.',
        price: 160,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ada Pradhaman',
        category: 'Desserts & Beverages',
        description: 'Traditional Kerala dessert crafted with steamed rice ribbons, jaggery syrup, coconut chips, and ghee.',
        price: 260,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Hotel Saravana Bhavan (Original Since 1981)',
    address: '21, Kennet Lane, Egmore / Pondy Bazaar, T. Nagar, Chennai',
    cuisine: 'Pure Vegetarian, South Indian Tiffin, Meals, Filter Coffee',
    openingHours: '06:30 AM - 10:30 PM',
    rating: 4.7,
    deliveryTime: '20-25 mins',
    costForTwo: 350,
    offerText: 'FLAT ₹75 OFF ABOVE ₹299',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Tiffin Window Counter' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Tiffin Window Counter' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'AC Family Dining' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'AC Family Dining' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Bhojanam Thali Section' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Heritage Long Table' }
    ],
    menu: [
      {
        name: 'Special Ghee Roast Masala Dosa',
        category: 'Main Course',
        description: 'Signature paper-crisp golden dosa roasted with fragrant cow ghee and stuffed with potato-onion masala, served with 3 chutneys & sambar.',
        price: 140,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Mini Ghee Podi Idli (14 Pcs)',
        category: 'Starters',
        description: 'Bite-sized button idlis tossed in spicy gunpowder idli podi and melted hot ghee, served with piping hot drumstick sambar.',
        price: 120,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crispy Medu Vada (2 Pcs)',
        category: 'Starters',
        description: 'Golden fried lentil donuts crisp on the outside, fluffy inside, served with fresh coconut chutney and sambar.',
        price: 75,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Saravana Special South Indian Thali Meals',
        category: 'Main Course',
        description: 'Complete royal feast: Steamed Ponni rice, Sambar, Pepper Rasam, Vatha Kuzhambu, Kootu, Poriyal, Curd, Appalam, Pickle, and Sweet Payasam.',
        price: 210,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ghee Rava Khichdi with Cashews',
        category: 'Main Course',
        description: 'Roasted semolina cooked with ghee, carrots, green peas, and roasted cashews, served with coconut chutney.',
        price: 95,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Saravana Pure Ghee Badam Halwa',
        category: 'Desserts & Beverages',
        description: 'Rich almond confection prepared with peeled almonds, sugar, saffron strands and pure ghee.',
        price: 130,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Iconic Madras Filter Coffee',
        category: 'Desserts & Beverages',
        description: 'Freshly brewed strong chicory filter coffee served hot in traditional brass davarah and tumbler.',
        price: 50,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Murugan Idli Shop',
    address: '77-1/A, G.N. Chetty Road, T. Nagar, Chennai',
    cuisine: 'South Indian Tiffin, Podi Idlis, Madurai Jigarthanda',
    openingHours: '07:00 AM - 11:00 PM',
    rating: 4.7,
    deliveryTime: '15-20 mins',
    costForTwo: 300,
    offerText: '20% OFF ABOVE ₹200',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Quick Tiffin Counter' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Quick Tiffin Counter' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Banana Leaf Dine-In' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Banana Leaf Dine-In' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Madurai Family Hall' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Group Dining Hall' }
    ],
    menu: [
      {
        name: 'Mallipoo Ghee Podi Idli (3 Pcs)',
        category: 'Starters',
        description: 'Jasmine-soft steaming idlis smothered in fiery Madurai gunpowder and cold-pressed sesame oil.',
        price: 110,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: '4-Chutney Tasting Platter',
        category: 'Starters',
        description: 'The famed Murugan quartet: White Coconut, Spicy Red Tomato, Coriander Mint, and Onion Kara Chutney.',
        price: 60,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ghee Onion Podi Uttapam',
        category: 'Main Course',
        description: 'Thick fermented rice pancake generously topped with caramelized shallots, podi, and cow ghee.',
        price: 135,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ghee Paper Roast Dosa',
        category: 'Main Course',
        description: 'Extra thin cone-rolled golden crepe roasted with pure ghee, served with four signature chutneys.',
        price: 150,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Madurai Special Jigarthanda',
        category: 'Desserts & Beverages',
        description: 'Famous Madurai cooling dessert drink made of badam pisin (almond gum), condensed milk, nannari syrup and basundi ice cream.',
        price: 110,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Traditional Filter Kaapi',
        category: 'Desserts & Beverages',
        description: 'Aromatic Kumbakonam style degree filter coffee brewed fresh to order.',
        price: 50,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Buhari Hotel (Est. 1951 — Birthplace of Chicken 65)',
    address: '83, Anna Salai, Mount Road, Chennai',
    cuisine: 'Heritage Dum Biryani, Chicken 65, Mughlai, Ceylon Parotta',
    openingHours: '11:30 AM - 11:30 PM',
    rating: 4.6,
    deliveryTime: '25-30 mins',
    costForTwo: 650,
    offerText: 'BIRTHPLACE OF 65: ₹100 OFF',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Anna Salai View' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Anna Salai View' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Heritage 1951 Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Heritage 1951 Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Mount Road Mezzanine' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Buhari VIP Chamber' }
    ],
    menu: [
      {
        name: 'Original Buhari Chicken 65',
        category: 'Starters',
        description: 'The world-famous dish created in 1965 by A.M. Buhari: succulent boneless chicken deep-fried and tossed with curry leaves, curd, and secret red spices.',
        price: 320,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Buhari Mutton Chukka Varuval',
        category: 'Starters',
        description: 'Tender baby goat cuts slow-roasted dry on an iron kadai with caramelized onions and freshly crushed pepper.',
        price: 390,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Buhari Special Mutton Dum Biryani',
        category: 'Main Course',
        description: 'Historic Chennai deg-cooked basmati mutton dum biryani served with spicy brinjal dalcha, onion pachadi, and boiled egg.',
        price: 380,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Buhari Chicken Dum Biryani',
        category: 'Main Course',
        description: 'Aromatic long-grain basmati cooked with bone-in tender chicken and whole spices on charcoal dum.',
        price: 310,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ceylon Egg Veechu Parotta',
        category: 'Breads & Rice',
        description: 'Wafer-thin tossed parotta stuffed with a savory layer of whisked eggs, onions, and ground spices.',
        price: 120,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Buhari Royal Falooda',
        category: 'Desserts & Beverages',
        description: 'Classic Mount Road falooda loaded with rose syrup, sabja seeds, falooda sev, dried nuts, and vanilla ice cream scoop.',
        price: 170,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Anjappar Chettinad Restaurant',
    address: '7/2, Jagannathan Road, Nungambakkam, Chennai',
    cuisine: 'Authentic Karaikudi Chettinad, Spicy Seafood & Biryani',
    openingHours: '11:30 AM - 11:00 PM',
    rating: 4.5,
    deliveryTime: '25-30 mins',
    costForTwo: 700,
    offerText: 'FREE MUTTON SOUP ABOVE ₹500',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Chettinad Pillar Booth' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Chettinad Pillar Booth' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Karaikudi Family Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Karaikudi Family Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Aathangudi Courtyard' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Chettiar Grand Suite' }
    ],
    menu: [
      {
        name: 'Chettinad Crab Pepper Fry',
        category: 'Starters',
        description: 'Fresh blue swimmer mud crabs tossed in roasted tellicherry black pepper, shallots, garlic, and curry leaves.',
        price: 480,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Nattu Kozhi Varuval',
        category: 'Starters',
        description: 'Country chicken sautéed dry with roasted Karaikudi stone-ground spices and curry leaves.',
        price: 360,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Anjappar Special Kozhi Biryani',
        category: 'Main Course',
        description: 'Fragrant seeraga samba small-grain rice cooked with succulent country chicken and Chettinad spices.',
        price: 320,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chettinad Mutton Chops Masala',
        category: 'Main Course',
        description: 'Succulent lamb chops braised slow in thick pepper, onion and tomato gravy.',
        price: 420,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Layered Veechu Parotta (2 Pcs)',
        category: 'Breads & Rice',
        description: 'Crisp airy parottas spun and slapped onto a hot iron tawa with ghee.',
        price: 90,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chettinad Elaneer Payasam',
        category: 'Desserts & Beverages',
        description: 'Creamy tender coconut pulp simmered with fresh milk and roasted cashews.',
        price: 140,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Dindigul Thalappakatti Biriyani',
    address: 'No. 42, 2nd Avenue, Besant Nagar Beach, Chennai',
    cuisine: 'Authentic Seeraga Samba Thalappakatti Mutton Biryani',
    openingHours: '11:00 AM - 11:00 PM',
    rating: 4.5,
    deliveryTime: '25-30 mins',
    costForTwo: 600,
    offerText: '15% OFF ON BIRYANI COMBO',
    imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Beach Breeze Deck' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Beach Breeze Deck' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Besant Nagar AC Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Besant Nagar AC Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Family Seating Wing' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Executive VIP Cabin' }
    ],
    menu: [
      {
        name: 'Thalappakatti Mutton Biriyani',
        category: 'Main Course',
        description: 'The iconic 1957 recipe cooked with short-grain seeraga samba rice, tender hill country mutton and pure ghee.',
        price: 395,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Thalappakatti Chicken Chukka',
        category: 'Starters',
        description: 'Boneless chicken morsels dry fried with Dindigul special hand-ground masala and shallots.',
        price: 310,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Pepper Fried Egg (3 Pcs)',
        category: 'Starters',
        description: 'Hard boiled eggs pan-tossed in pepper powder, curry leaves and ground cumin.',
        price: 150,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Enna Kathirikai Kuzhambu',
        category: 'Main Course',
        description: 'Small stuffed brinjals cooked in sesame paste and tamarind gravy, traditional pairing with biryani.',
        price: 220,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Coin Parotta (4 Pcs)',
        category: 'Breads & Rice',
        description: 'Flaky mini coin parottas cooked on flat iron tawa with clarified butter.',
        price: 110,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chilled Special Rose Milk',
        category: 'Desserts & Beverages',
        description: 'Refreshing thick milk infused with natural rose petal essence, a Chennai favorite.',
        price: 80,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Ratna Cafe (Est. 1948)',
    address: '255, Triplicane High Road, Triplicane, Chennai',
    cuisine: 'Legendary Brass Bucket Sambar, South Indian Tiffin, Filter Coffee',
    openingHours: '06:00 AM - 10:30 PM',
    rating: 4.6,
    deliveryTime: '20-25 mins',
    costForTwo: 250,
    offerText: 'FREE FILTER COFFEE ABOVE ₹200',
    imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Triplicane Heritage Counter' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Triplicane Heritage Counter' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'AC Heritage Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'AC Heritage Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Brass Bucket Dining' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Grand Family Seating' }
    ],
    menu: [
      {
        name: 'Legendary Sambhar Idli (2 Pcs)',
        category: 'Starters',
        description: 'Duo of soft steaming idlis submerged completely in an overflowing bowl of Ratna Cafe’s piping hot signature brass-bucket sambar.',
        price: 85,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crispy Sambhar Vadai',
        category: 'Starters',
        description: 'Crisp urad dal vada drenched in boiling sambar with fresh coriander and ghee drizzle.',
        price: 75,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Triplicane Ghee Masala Dosa',
        category: 'Main Course',
        description: 'Crispy golden griddle dosa smeared with potato masala, roasted in pure cow ghee.',
        price: 120,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Puffy Poori Masala (2 Pcs)',
        category: 'Main Course',
        description: 'Whole wheat fluffy puffed pooris served with lightly spiced potato-onion gravy.',
        price: 90,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ghee Dripping Badam Halwa',
        category: 'Desserts & Beverages',
        description: 'Warm almond pudding made in pure ghee every morning, melt-in-the-mouth texture.',
        price: 110,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Ratna Cafe Degree Filter Coffee',
        category: 'Desserts & Beverages',
        description: 'Fresh decoction brewed with full-cream hot milk, served in brass tumbler.',
        price: 40,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'Urban Woodfire Pizzeria',
    address: 'North Usman Road, T. Nagar, Chennai',
    cuisine: 'Pizzas, Pasta, Italian, Garlic Bread',
    openingHours: '12:00 PM - 11:00 PM',
    rating: 4.6,
    deliveryTime: '20-25 mins',
    costForTwo: 550,
    offerText: 'FLAT ₹125 OFF',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Oven View Counter' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Oven View Counter' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Pizzeria Dining Area' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Pizzeria Dining Area' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Family Seating' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'Party Lounge' }
    ],
    menu: [
      {
        name: 'Cheesy Garlic Pull-Apart Bread',
        category: 'Starters',
        description: 'Warm sourdough loaf baked with roasted garlic butter, parsley, and molten cheddar.',
        price: 240,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Artisan Margherita Woodfire Pizza',
        category: 'Main Course',
        description: 'San Marzano Italian tomato sauce, fresh buffalo mozzarella, aromatic basil, and olive oil.',
        price: 490,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Spicy Pepperoni & Hot Honey Pizza',
        category: 'Main Course',
        description: 'Italian pepperoni slices, pickled jalapenos, hot honey drizzle, and fresh mozzarella.',
        price: 590,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Tiramisu Classico',
        category: 'Desserts & Beverages',
        description: 'Savoiardi ladyfingers soaked in espresso coffee and layered with whipped mascarpone cream.',
        price: 220,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    name: 'The Royal Spice Kitchen',
    address: '100 Feet Road, Indiranagar, Bengaluru',
    cuisine: 'North Indian, Mughlai, Biryani',
    openingHours: '11:00 AM - 11:30 PM',
    rating: 4.4,
    deliveryTime: '25-30 mins',
    costForTwo: 700,
    offerText: '50% OFF UP TO ₹100',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80',
    is_approved: 1,
    tables: [
      { tableNumber: 'T1', capacity: 2, floor_zone: 'Window View' },
      { tableNumber: 'T2', capacity: 2, floor_zone: 'Window View' },
      { tableNumber: 'T3', capacity: 4, floor_zone: 'Main Hall' },
      { tableNumber: 'T4', capacity: 4, floor_zone: 'Main Hall' },
      { tableNumber: 'T5', capacity: 6, floor_zone: 'Patio & Garden' },
      { tableNumber: 'T6', capacity: 8, floor_zone: 'VIP Lounge' }
    ],
    menu: [
      {
        name: 'Old Delhi Butter Chicken',
        category: 'Main Course',
        description: 'Slow-simmered shredded tandoori chicken in a rich tomato, butter, and dried fenugreek gravy.',
        price: 450,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Paneer Tikka Angaare',
        category: 'Starters',
        description: 'Fresh cottage cheese marinated in spiced hung curd, charred to perfection in tandoor.',
        price: 320,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Dum Pukht Lucknowi Biryani',
        category: 'Main Course',
        description: 'Aged basmati rice slow-cooked on dum with aromatic whole spices, served with raita.',
        price: 420,
        dietaryTag: 'Non-Veg',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Butter Garlic Naan',
        category: 'Breads & Rice',
        description: 'Crisp tandoor-baked leavened bread brushed generously with garlic butter and fresh cilantro.',
        price: 90,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80'
      },
      {
        name: 'Alphonso Mango Lassi',
        category: 'Desserts & Beverages',
        description: 'Chilled creamy yogurt smoothie blended with ripe Ratnagiri Alphonso mango puree.',
        price: 140,
        dietaryTag: 'Veg',
        imageUrl: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500&auto=format&fit=crop&q=80'
      }
    ]
  }
];

// Seed Restaurants, Tables, and Menu Items
const restMap = {};
const allTableIds = [];
const allMenuItems = [];

for (const r of restaurants) {
  const restRes = db.run(
    `INSERT INTO restaurants (name, address, cuisine, openingHours, rating, deliveryTime, costForTwo, offerText, imageUrl, is_approved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.name, r.address, r.cuisine, r.openingHours, r.rating, r.deliveryTime, r.costForTwo, r.offerText, r.imageUrl, r.is_approved]
  );
  const restId = Number(restRes.lastInsertRowid);
  restMap[r.name] = { id: restId, tables: [], menu: [] };

  // Seed Tables
  for (const t of r.tables) {
    const tableRes = db.run(
      'INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES (?, ?, ?, ?, ?)',
      [restId, t.tableNumber, t.capacity, 'Available', t.floor_zone]
    );
    const tblId = Number(tableRes.lastInsertRowid);
    restMap[r.name].tables.push(tblId);
    allTableIds.push({ id: tblId, restaurantId: restId, tableNumber: t.tableNumber });
  }

  // Seed Menu
  for (const m of r.menu) {
    const menuRes = db.run(
      `INSERT INTO menu_items (restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [restId, m.name, m.description, m.price, m.category, m.dietaryTag, m.imageUrl]
    );
    const mId = Number(menuRes.lastInsertRowid);
    restMap[r.name].menu.push({ id: mId, name: m.name, price: m.price });
    allMenuItems.push({ id: mId, restaurantId: restId, name: m.name, price: m.price });
  }
}
console.log(`✔ ${restaurants.length} Restaurants seeded with real Chennai hotels, tables, and full menus!`);

// 4. Seed Realistic Sample Reservations
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const itcData = restMap['ITC Grand Chola — The Madras Pavilion & Peshawri'];
const leelaData = restMap['The Leela Palace — Jamavar'];
const saravanaData = restMap['Hotel Saravana Bhavan (Original Since 1981)'];
const buhariData = restMap['Buhari Hotel (Est. 1951 — Birthplace of Chicken 65)'];

// Rahul reserves at ITC Grand Chola
db.run(
  `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
   VALUES (?, ?, ?, ?, '20:00', 4, 'Confirmed', 'Peshawri royal pavilion requested for family anniversary')`,
  [userIds['Customer'], itcData.id, itcData.tables[2], today]
);

// Sebastian reserves at The Leela Palace Jamavar
db.run(
  `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
   VALUES (?, ?, ?, ?, '19:30', 2, 'Confirmed', 'Bay view window table with flower setup')`,
  [dummyCustomerIds[0], leelaData.id, leelaData.tables[0], today]
);

// Tashu reserves at Saravana Bhavan
db.run(
  `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
   VALUES (?, ?, ?, ?, '13:00', 4, 'Confirmed', 'Traditional South Indian lunch meals')`,
  [dummyCustomerIds[1], saravanaData.id, saravanaData.tables[2], today]
);

// Rishika reserves at Buhari Hotel for tomorrow
db.run(
  `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
   VALUES (?, ?, ?, ?, '20:30', 6, 'Confirmed', 'Birthplace of Chicken 65 birthday celebration')`,
  [dummyCustomerIds[2], buhariData.id, buhariData.tables[4], tomorrow]
);

// Arjun has active 5-min concurrency lock on ITC Grand Chola Table 4
db.run(
  `INSERT INTO table_locks (tableId, lockedByUserId, reservationDate, timeSlot, lockExpiresAt)
   VALUES (?, ?, ?, '21:00', datetime('now', '+5 minutes'))`,
  [itcData.tables[3], dummyCustomerIds[3], today]
);

// Ananya has a past cancelled reservation
db.run(
  `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
   VALUES (?, ?, ?, ?, '18:00', 2, 'Cancelled', 'Flight delayed, rescheduled to next week')`,
  [dummyCustomerIds[4], itcData.id, itcData.tables[1], today]
);
console.log('✔ Real reservations and active concurrency locks seeded');

// 5. Seed Realistic Orders Across Kitchen Pipeline
// Order 1: Dine-In at ITC Grand Chola
const ord1 = db.run(
  `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
   VALUES (?, ?, 'Dine-In', ?, '', 2320, 'Preparing')`,
  [userIds['Customer'], itcData.id, itcData.tables[2]]
);
const ord1Id = Number(ord1.lastInsertRowid);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 1450, 1)', [ord1Id, itcData.menu[0].id, itcData.menu[0].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 580, 1)', [ord1Id, itcData.menu[2].id, itcData.menu[2].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 290, 1)', [ord1Id, itcData.menu[6].id, itcData.menu[6].name]);
db.run(
  `INSERT INTO payments (orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus)
   VALUES (?, 'pay_rzp_itc_live_901', 'order_rzp_itc_101', 'sig_test_verified', 2320, 'Success')`,
  [ord1Id]
);

// Order 2: Doorstep Delivery from Buhari Hotel (Chicken 65 & Biryani)
const ord2 = db.run(
  `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
   VALUES (?, ?, 'Delivery', NULL, 'Flat 4B, Ceebros Heritage, Nungambakkam High Road, Chennai', 700, 'Out for Delivery')`,
  [userIds['Customer'], buhariData.id]
);
const ord2Id = Number(ord2.lastInsertRowid);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 320, 1)', [ord2Id, buhariData.menu[0].id, buhariData.menu[0].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 380, 1)', [ord2Id, buhariData.menu[2].id, buhariData.menu[2].name]);
db.run(
  `INSERT INTO payments (orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus)
   VALUES (?, 'pay_rzp_buhari_902', 'order_rzp_buhari_102', 'sig_test_verified', 700, 'Success')`,
  [ord2Id]
);

// Order 3: Delivery from Hotel Saravana Bhavan
const ord3 = db.run(
  `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
   VALUES (?, ?, 'Delivery', NULL, '15, 2nd Main Road, Gandhinagar, Adyar, Chennai', 310, 'Delivered')`,
  [dummyCustomerIds[0], saravanaData.id]
);
const ord3Id = Number(ord3.lastInsertRowid);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 140, 1)', [ord3Id, saravanaData.menu[0].id, saravanaData.menu[0].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 120, 1)', [ord3Id, saravanaData.menu[1].id, saravanaData.menu[1].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 50, 1)', [ord3Id, saravanaData.menu[6].id, saravanaData.menu[6].name]);
db.run(
  `INSERT INTO payments (orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus)
   VALUES (?, 'pay_rzp_hsb_903', 'order_rzp_hsb_103', 'sig_test_verified', 310, 'Success')`,
  [ord3Id]
);

// Order 4: Dine-In at The Leela Palace Jamavar
const ord4 = db.run(
  `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
   VALUES (?, ?, 'Dine-In', ?, '', 2500, 'Served')`,
  [dummyCustomerIds[1], leelaData.id, leelaData.tables[0]]
);
const ord4Id = Number(ord4.lastInsertRowid);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 1650, 1)', [ord4Id, leelaData.menu[0].id, leelaData.menu[0].name]);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 850, 1)', [ord4Id, leelaData.menu[2].id, leelaData.menu[2].name]);
db.run(
  `INSERT INTO payments (orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, amount, paymentStatus)
   VALUES (?, 'pay_rzp_leela_904', 'order_rzp_leela_104', 'sig_test_verified', 2500, 'Success')`,
  [ord4Id]
);

// Order 5: Pending Order
const ord5 = db.run(
  `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
   VALUES (?, ?, 'Delivery', NULL, 'Tower 2, Olympia Opaline, OMR, Navalur, Chennai', 420, 'Pending')`,
  [dummyCustomerIds[2], itcData.id]
);
const ord5Id = Number(ord5.lastInsertRowid);
db.run('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, 580, 1)', [ord5Id, itcData.menu[2].id, itcData.menu[2].name]);
db.run(
  `INSERT INTO payments (orderId, amount, paymentStatus)
   VALUES (?, 580, 'Pending')`,
  [ord5Id]
);
console.log('✔ Orders across pipeline stages (Pending, Preparing, Out for Delivery, Served, Delivered) seeded');

// 6. Seed Authentic Customer Reviews for Chennai Establishments
const reviews = [
  {
    customerId: userIds['Customer'],
    restaurantId: itcData.id,
    rating: 5,
    comment: 'The Sikandari Raan and Dal Bukhara at Peshawri are unparalleled in South India. The royal ambience in Guindy is world-class.',
    isFlagged: 0
  },
  {
    customerId: dummyCustomerIds[0],
    restaurantId: leelaData.id,
    rating: 5,
    comment: 'Spectacular Bay of Bengal ocean view dining! The Lobster Nerulli and Tender Coconut Payasam were divine.',
    isFlagged: 0
  },
  {
    customerId: dummyCustomerIds[1],
    restaurantId: buhariData.id,
    rating: 5,
    comment: 'Nothing beats eating the original Chicken 65 at the birthplace where it was created in 1965! Mutton Dum Biryani was sensational.',
    isFlagged: 0
  },
  {
    customerId: dummyCustomerIds[2],
    restaurantId: saravanaData.id,
    rating: 5,
    comment: 'Crispy Ghee Roast Dosa and hot mini podi idlis are unmatched. Best degree filter coffee in Chennai.',
    isFlagged: 0
  },
  {
    customerId: dummyCustomerIds[3],
    restaurantId: restMap['Ratna Cafe (Est. 1948)'].id,
    rating: 5,
    comment: 'The famous brass bucket sambar poured hot over the idlis and vadai is legendary. Authentic Triplicane heritage!',
    isFlagged: 0
  },
  {
    customerId: dummyCustomerIds[4],
    restaurantId: itcData.id,
    rating: 1,
    comment: 'CLAIM FREE ₹10000 FOOD COUPONS NOW ON: scam-free-food-chennai.online CLICK HERE',
    isFlagged: 1
  }
];

for (const rev of reviews) {
  db.run(
    'INSERT INTO reviews (customerId, restaurantId, rating, comment, isFlagged, isHidden) VALUES (?, ?, ?, ?, ?, 0)',
    [rev.customerId, rev.restaurantId, rev.rating, rev.comment, rev.isFlagged]
  );
}
console.log('✔ Customer reviews seeded (including spam review for moderation demo)');

// 7. Seed Audit Logs
db.run("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)", [
  userIds['Admin'],
  'SYSTEM_INIT',
  'FeastHub engine seeded with real Chennai luxury hotels and legendary eateries'
]);
db.run("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)", [
  userIds['Customer'],
  'TABLE_RESERVED',
  'Rahul booked Table T3 at ITC Grand Chola for 20:00'
]);
db.run("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)", [
  dummyCustomerIds[3],
  'TABLE_LOCK_ACQUIRED',
  'Arjun locked Table T4 at ITC Grand Chola (5-min hold guard active)'
]);

console.log('\n====================================================');
console.log(' FeastHub Chennai & Luxury Hotels Database Initialized!');
console.log('====================================================');
console.log('✔ 11 Real Restaurants & Chennai Hotels:');
console.log('   1. ITC Grand Chola — The Madras Pavilion & Peshawri (Guindy, Chennai)');
console.log('   2. The Leela Palace — Jamavar (MRC Nagar, Chennai)');
console.log('   3. Taj Coromandel — Southern Spice (Nungambakkam, Chennai)');
console.log('   4. Hotel Saravana Bhavan (Original Since 1981 - Egmore / T. Nagar)');
console.log('   5. Murugan Idli Shop (T. Nagar, Chennai)');
console.log('   6. Buhari Hotel (Est. 1951 - Birthplace of Chicken 65, Mount Road)');
console.log('   7. Anjappar Chettinad Restaurant (Nungambakkam, Chennai)');
console.log('   8. Dindigul Thalappakatti Biriyani (Besant Nagar Beach, Chennai)');
console.log('   9. Ratna Cafe (Est. 1948 - Triplicane, Chennai)');
console.log('  10. Urban Woodfire Pizzeria (T. Nagar, Chennai)');
console.log('  11. The Royal Spice Kitchen (Indiranagar, Bengaluru)');
console.log('\n📋 Demo User Credentials (all passwords: password123):');
console.log('   customer@demo.com   → Customer (Rahul Sharma)');
console.log('   sebastian@demo.com  → Customer (Sebastian)');
console.log('   tashu@demo.com      → Customer (Tashu)');
console.log('   rishika@demo.com    → Customer (Rishika)');
console.log('   arjun@demo.com      → Customer (Arjun)');
console.log('   ananya@demo.com     → Customer (Ananya)');
console.log('   staff@demo.com      → Staff (Chef Rajesh)');
console.log('   admin@demo.com      → Admin (Platform Admin)');
console.log('   moderator@demo.com  → Moderator (Trust & Safety Lead)');
console.log('====================================================\n');
