import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import {
  UtensilsCrossed,
  Plus,
  Check,
  Filter,
  Search,
  ShoppingBag
} from 'lucide-react';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Breads & Rice', 'Desserts & Beverages'];

export default function MenuOrder({ onOpenCart }) {
  const [searchParams] = useSearchParams();
  const { addToCart, selectedRestaurantId, setSelectedRestaurantId, cartCount, cartTotal } = useCart();
  const { socket } = useSocket();

  const [restaurantId, setRestaurantId] = useState(searchParams.get('restaurantId') || selectedRestaurantId || '1');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dietaryFilter, setDietaryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState([]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch('/api/admin/restaurants');
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenu = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const url = selectedCategory === 'All'
        ? `/api/menu?restaurantId=${restaurantId}`
        : `/api/menu?restaurantId=${restaurantId}&category=${encodeURIComponent(selectedCategory)}`;
      const res = await fetch(url);
      const data = await res.json();
      setMenuItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId, selectedCategory]);

  // Real-time menu updates (dish availability, price change, new dishes)
  useEffect(() => {
    if (!socket) return;
    const handleMenuUpdate = (payload) => {
      if (!payload?.restaurantId || payload.restaurantId === Number(restaurantId)) {
        fetchMenu();
      }
    };
    socket.on('menu_updated', handleMenuUpdate);
    return () => {
      socket.off('menu_updated', handleMenuUpdate);
    };
  }, [socket, restaurantId, selectedCategory]);

  // Dish Customization Modal State
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedSpice, setSelectedSpice] = useState('Medium');
  const [selectedAddon, setSelectedAddon] = useState('None');
  const [addonPrice, setAddonPrice] = useState(0);
  const [specialNote, setSpecialNote] = useState('');

  const openCustomizer = (item) => {
    setCustomizingItem(item);
    setSelectedSpice('Medium');
    setSelectedAddon('None');
    setAddonPrice(0);
    setSpecialNote('');
  };

  const handleApplyCustomization = () => {
    if (!customizingItem) return;
    const finalPrice = customizingItem.price + addonPrice;
    addToCart(
      { ...customizingItem, price: finalPrice },
      restaurantId,
      {
        spiceLevel: selectedSpice,
        addon: selectedAddon !== 'None' ? selectedAddon : null,
        note: specialNote.trim() || null
      }
    );
    setAddedItemIds((prev) => [...prev, customizingItem.id]);
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== customizingItem.id));
    }, 900);
    setCustomizingItem(null);
  };

  const handleAddToCart = (item) => {
    addToCart(item, restaurantId);
    setAddedItemIds((prev) => [...prev, item.id]);
    setTimeout(() => {
      setAddedItemIds((prev) => prev.filter((id) => id !== item.id));
    }, 900);
  };

  const filteredItems = menuItems.filter((item) => {
    if (dietaryFilter === 'Veg' && item.dietaryTag !== 'Veg') return false;
    if (dietaryFilter === 'Non-Veg' && item.dietaryTag !== 'Non-Veg') return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const currentRestaurant = restaurants.find((r) => r.id === Number(restaurantId)) || restaurants[0];

  return (
    <div className="container" style={{ padding: '1.5rem 1.25rem 4rem' }}>
      {/* Swiggy/Zomato Restaurant Banner Card */}
      {currentRestaurant && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(to right, #ffffff, #fff7f7)',
            borderColor: '#fecdd3'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentRestaurant.name}
                </h1>
                <div className="rating-badge" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                  <span>{currentRestaurant.rating || 4.3}</span>
                  <span style={{ fontSize: '0.75rem' }}>★</span>
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.35rem' }}>
                {currentRestaurant.cuisine}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {currentRestaurant.address} • {currentRestaurant.openingHours}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                <span>⏱️ {currentRestaurant.deliveryTime || '25-30 mins'}</span>
                <span>•</span>
                <span>₹{currentRestaurant.costForTwo || 600} for two</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              {currentRestaurant.offerText && (
                <div style={{ background: '#e23744', color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                  🏷️ {currentRestaurant.offerText}
                </div>
              )}
              {cartCount > 0 && (
                <button onClick={onOpenCart} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem' }}>
                  <ShoppingBag size={16} /> View Cart ({cartCount} • ₹{cartTotal})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.25rem' }}>
        <div className="grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Switch Restaurant</label>
            <select
              value={restaurantId}
              onChange={(e) => {
                setRestaurantId(e.target.value);
                setSelectedRestaurantId(e.target.value);
              }}
              className="form-select"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.address.split(',').slice(-2).join(',').trim()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Dietary Preference</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['All', 'Veg', 'Non-Veg'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDietaryFilter(tag)}
                  className={`btn btn-sm ${dietaryFilter === tag ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Search Dishes</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Paneer, Biryani, Naan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: 20, fontSize: '0.8rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Cards Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Loading dishes...</p>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <UtensilsCrossed size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No dishes match your selection</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Try clearing filters or search for another keyword.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0.5rem 1.75rem', background: '#ffffff', borderRadius: 16 }}>
          <div style={{ padding: '1.25rem 0 0.5rem', borderBottom: '1px solid #f1f2f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1c1c24', margin: 0 }}>
              {selectedCategory === 'All' ? 'Recommended for You' : selectedCategory} ({filteredItems.length})
            </h2>
          </div>
          {filteredItems.map((item) => {
            const isJustAdded = addedItemIds.includes(item.id);
            return (
              <div key={item.id} className="dish-card">
                <div className="dish-details">
                  {item.dietaryTag === 'Veg' ? (
                    <div className="dish-veg-badge" title="Pure Veg">
                      <div className="dish-veg-badge-dot" />
                    </div>
                  ) : (
                    <div className="dish-nonveg-badge" title="Non-Veg">
                      <div className="dish-nonveg-badge-dot" />
                    </div>
                  )}

                  <h3 className="dish-name">{item.name}</h3>
                  <div className="dish-price">₹{item.price}</div>
                  {item.description && <p className="dish-desc">{item.description}</p>}
                </div>

                <div className="dish-action-wrapper">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="dish-img"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 96,
                        background: '#f8fafc',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8'
                      }}
                    >
                      <UtensilsCrossed size={24} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className={`dish-add-btn ${isJustAdded ? 'added' : ''}`}
                  >
                    {isJustAdded ? (
                      <>
                        <Check size={13} /> ADDED
                      </>
                    ) : (
                      <>
                        <Plus size={13} /> ADD
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCustomizer(item);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: -18,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#686b78',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      padding: 0
                    }}
                  >
                    customisable ▾
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dish Customization Modal */}
      {customizingItem && (
        <div className="modal-overlay" onClick={() => setCustomizingItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, borderRadius: 16 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.15rem', color: '#181920' }}>Customize {customizingItem.name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#686b78' }}>Base Price: ₹{customizingItem.price}</span>
              </div>
              <button onClick={() => setCustomizingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
                ✕
              </button>
            </div>

            {/* Spice Level */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Choose Spice Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[
                  { id: 'Mild', label: 'Mild', icon: '🟢' },
                  { id: 'Medium', label: 'Medium', icon: '🌶️' },
                  { id: 'Spicy', label: 'Spicy', icon: '🌶️🌶️' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSpice(s.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 8,
                      border: selectedSpice === s.id ? '1.5px solid #e23744' : '1px solid #e2e8f0',
                      background: selectedSpice === s.id ? '#fff1f2' : '#ffffff',
                      color: selectedSpice === s.id ? '#e23744' : '#181920',
                      fontWeight: selectedSpice === s.id ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div>{s.icon}</div>
                    <div>{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Add-on Accompaniment</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 'None', label: 'Regular Preparation', price: 0 },
                  { id: 'Extra Raita & Gravy', label: 'Extra Raita & Salna Gravy', price: 30 },
                  { id: 'Extra Butter & Ghee', label: 'Extra Butter / Desi Ghee Topping', price: 25 }
                ].map((a) => (
                  <label
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: selectedAddon === a.id ? '1.5px solid #e23744' : '1px solid #e2e8f0',
                      background: selectedAddon === a.id ? '#fff1f2' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.825rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="dishAddon"
                        checked={selectedAddon === a.id}
                        onChange={() => {
                          setSelectedAddon(a.id);
                          setAddonPrice(a.price);
                        }}
                        style={{ accentColor: '#e23744' }}
                      />
                      <span>{a.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: a.price ? '#e23744' : '#64748b' }}>
                      {a.price ? `+₹${a.price}` : 'Free'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Special Cooking Instructions</label>
              <input
                type="text"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="e.g. Less oil, crispy, extra onions..."
                className="form-input"
                style={{ fontSize: '0.825rem' }}
              />
            </div>

            <button
              type="button"
              onClick={handleApplyCustomization}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontWeight: 800 }}
            >
              Add to Order • ₹{customizingItem.price + addonPrice}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
