import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  UtensilsCrossed,
  Clock,
  MapPin,
  Star,
  Search,
  Truck,
  Percent,
  X
} from 'lucide-react';

const POPULAR_CUISINES = [
  {
    name: 'Biryani',
    query: 'Biryani',
    img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Dosa & Idli',
    query: 'Dosa',
    img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Chicken 65',
    query: 'Chicken',
    img: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Royal Dining',
    query: 'Chola',
    img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Chettinad',
    query: 'Chettinad',
    img: 'https://images.unsplash.com/photo-160389458373-5ac82b2ae398?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Seafood',
    query: 'Seafood',
    img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Pizzas',
    query: 'Pizza',
    img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Filter Coffee',
    query: 'Coffee',
    img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80'
  }
];

const CHENNAI_LOCALITIES = [
  'All Chennai',
  'Guindy',
  'MRC Nagar',
  'Nungambakkam',
  'T. Nagar',
  'Mount Road',
  'Triplicane',
  'Besant Nagar'
];

export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' or 'dining'
  const [selectedCity, setSelectedCity] = useState('Chennai');
  const [selectedLocality, setSelectedLocality] = useState('All Chennai');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState(false);
  const [filterFast, setFilterFast] = useState(false);
  const [filterPureVeg, setFilterPureVeg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/restaurants')
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data.restaurants || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredRestaurants = restaurants.filter((r) => {
    // City filter
    if (selectedCity === 'Chennai' && !r.address.toLowerCase().includes('chennai')) {
      return false;
    }
    if (selectedCity === 'Bengaluru' && !r.address.toLowerCase().includes('bengaluru')) {
      return false;
    }

    // Locality filter
    if (selectedCity === 'Chennai' && selectedLocality !== 'All Chennai') {
      const locKey = selectedLocality.toLowerCase().replace(/\s+/g, '');
      const addrClean = r.address.toLowerCase().replace(/\s+/g, '');
      if (!addrClean.includes(locKey)) return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchCuisine = r.cuisine.toLowerCase().includes(q);
      const matchAddress = r.address.toLowerCase().includes(q);
      if (!matchName && !matchCuisine && !matchAddress) return false;
    }

    // Rating filter (4.5+)
    if (filterRating && (r.rating || 4.0) < 4.5) return false;

    // Fast delivery filter (< 30 mins)
    if (filterFast && !r.deliveryTime?.includes('15') && !r.deliveryTime?.includes('20') && !r.deliveryTime?.includes('25')) {
      return false;
    }

    // Pure veg filter
    if (filterPureVeg && !r.cuisine.toLowerCase().includes('vegetarian')) {
      return false;
    }

    return true;
  });

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Warm Food-tech Editorial Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#181920', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
          Discover Chennai's Best Food &amp; Dining
        </h1>
        <p style={{ color: '#5e606d', fontSize: '0.9rem' }}>
          Iconic heritage eateries, master chefs, and instant live table reservations
        </p>
      </div>

      {/* Service Type Switcher (Zomato / Swiggy style) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="tab-pills" style={{ margin: 0, border: 'none', padding: 0 }}>
          <button
            className={`tab-pill ${activeTab === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivery')}
          >
            <Truck size={17} /> Food Delivery
          </button>
          <button
            className={`tab-pill ${activeTab === 'dining' ? 'active' : ''}`}
            onClick={() => setActiveTab('dining')}
          >
            <CalendarCheck size={17} /> Dining Out &amp; Tables
          </button>
        </div>

        {/* City Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '3px', borderRadius: 10 }}>
          {['Chennai', 'All', 'Bengaluru'].map((city) => (
            <button
              key={city}
              onClick={() => {
                setSelectedCity(city);
                setSelectedLocality('All Chennai');
              }}
              style={{
                border: 'none',
                background: selectedCity === city ? '#ffffff' : 'transparent',
                color: selectedCity === city ? '#0f172a' : '#64748b',
                fontWeight: selectedCity === city ? 700 : 500,
                fontSize: '0.825rem',
                padding: '5px 12px',
                borderRadius: 7,
                cursor: 'pointer',
                boxShadow: selectedCity === city ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {city === 'All' ? 'All Locations' : city}
            </button>
          ))}
        </div>
      </div>

      {/* Chennai Locality Bar (Clean & unobtrusive) */}
      {selectedCity === 'Chennai' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', paddingBottom: '0.75rem', borderBottom: '1px solid #eef2f6' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
            Locality:
          </span>
          {CHENNAI_LOCALITIES.map((loc) => (
            <button
              key={loc}
              onClick={() => setSelectedLocality(loc)}
              style={{
                border: selectedLocality === loc ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: selectedLocality === loc ? '#0f172a' : '#ffffff',
                color: selectedLocality === loc ? '#ffffff' : '#475569',
                fontSize: '0.78rem',
                fontWeight: selectedLocality === loc ? 600 : 500,
                padding: '4px 11px',
                borderRadius: 999,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      )}

      {/* What's on your mind? Cuisine Circles */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1c1c1c', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Inspiration for your order
        </h2>
        <div className="category-circle-list">
          {POPULAR_CUISINES.map((item) => (
            <div
              key={item.name}
              className="category-circle-item"
              onClick={() => setSearchQuery(item.query)}
            >
              <img src={item.img} alt={item.name} className="category-circle-img" loading="lazy" />
              <span className="category-circle-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filter Row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <input
            type="text"
            placeholder="Search for restaurants, cuisines, or dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: '2.5rem',
              borderRadius: 12,
              height: 48,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '0.9rem'
            }}
          />
          <Search size={18} style={{ position: 'absolute', left: 14, top: 15, color: '#94a3b8' }} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: 15,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterRating(!filterRating)}
            className={`btn btn-sm ${filterRating ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: 999 }}
          >
            <Star size={13} fill={filterRating ? 'white' : '#eab308'} color="#eab308" />
            Rating 4.5+
          </button>
          <button
            onClick={() => setFilterFast(!filterFast)}
            className={`btn btn-sm ${filterFast ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: 999 }}
          >
            <Clock size={13} />
            Fast Delivery (&le; 25 mins)
          </button>
          <button
            onClick={() => setFilterPureVeg(!filterPureVeg)}
            className={`btn btn-sm ${filterPureVeg ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: 999 }}
          >
            Pure Veg
          </button>
        </div>
      </div>

      {/* Section Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1c1c1c', letterSpacing: '-0.02em', margin: 0 }}>
            {activeTab === 'delivery'
              ? `Delivery Restaurants in ${selectedCity === 'All' ? 'All Areas' : selectedCity}`
              : `Dining Out & Table Reservations in ${selectedCity === 'All' ? 'All Areas' : selectedCity}`}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#686b78', margin: '4px 0 0' }}>
            {filteredRestaurants.length} places available for {activeTab === 'delivery' ? 'doorstep delivery' : 'live table reservation'}
          </p>
        </div>
      </div>

      {/* Restaurant Cards Grid */}
      {loading ? (
        <p style={{ color: '#64748b', padding: '3rem 0', textAlign: 'center' }}>Loading restaurants...</p>
      ) : filteredRestaurants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <UtensilsCrossed size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No restaurants found</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Try clearing filters or search for another cuisine.</p>
          <button
            onClick={() => {
              setSelectedCity('All');
              setSelectedLocality('All Chennai');
              setSearchQuery('');
              setFilterRating(false);
              setFilterFast(false);
              setFilterPureVeg(false);
            }}
            className="btn btn-outline btn-sm"
            style={{ marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '1.5rem' }}>
          {filteredRestaurants.map((rest) => {
            const targetUrl = activeTab === 'delivery'
              ? `/menu?restaurantId=${rest.id}`
              : `/tables?restaurantId=${rest.id}`;
            const secondaryUrl = activeTab === 'delivery'
              ? `/tables?restaurantId=${rest.id}`
              : `/menu?restaurantId=${rest.id}`;

            return (
              <div
                key={rest.id}
                className="restaurant-card"
                onClick={() => navigate(targetUrl)}
                style={{ cursor: 'pointer' }}
              >
                <div className="restaurant-img-wrapper">
                  <img
                    src={rest.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80'}
                    alt={rest.name}
                    className="restaurant-img"
                    loading="lazy"
                  />
                  {rest.offerText && (
                    <div className="restaurant-offer-badge">
                      <Percent size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {rest.offerText}
                    </div>
                  )}
                </div>

                <div className="restaurant-body">
                  <div className="restaurant-header">
                    <div className="restaurant-name">{rest.name}</div>
                    <div className="rating-badge">
                      <span>{rest.rating || 4.5}</span>
                      <Star size={10} fill="white" color="white" />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#5e606d', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rest.cuisine}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#90929e', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                    <MapPin size={13} /> {rest.address}
                  </div>

                  <div className="restaurant-meta" style={{ marginTop: 'auto' }}>
                    {activeTab === 'delivery' ? (
                      <>
                        <span><Clock size={13} style={{ display: 'inline', marginRight: 3 }} />{rest.deliveryTime || '25-30 mins'}</span>
                        <span>₹{rest.costForTwo || 600} for two</span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>● Instant Table Confirmation</span>
                        <span>₹{rest.costForTwo || 600} for two</span>
                      </>
                    )}
                  </div>

                  {/* Clean Consumer Footer Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f2f4' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#e23744' }}>
                      {activeTab === 'delivery' ? 'Order Online →' : 'Book Table →'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(secondaryUrl);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#686b78',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      {activeTab === 'delivery' ? 'Reserve Table' : 'Order Online'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
