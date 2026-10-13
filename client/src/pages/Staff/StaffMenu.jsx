import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, CheckCircle, XCircle, UtensilsCrossed } from 'lucide-react';

export default function StaffMenu() {
  const { token } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Starters');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [dietaryTag, setDietaryTag] = useState('Veg');
  const [imageUrl, setImageUrl] = useState('');

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu?restaurantId=1');
      const data = await res.json();
      setMenuItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailability = async (id) => {
    try {
      const res = await fetch(`/api/menu/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isAvailable: data.isAvailable } : item))
      );
    } catch (err) {
      alert('Failed to toggle item availability');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this menu item?')) return;
    try {
      await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurantId: 1,
          name,
          category,
          price: Number(price),
          description,
          dietaryTag,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddForm(false);
      setName('');
      setPrice('');
      setDescription('');
      fetchMenu();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            Menu Management & Inventory (Staff Portal)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Configure kitchen dishes, pricing, and live availability toggles
          </p>
        </div>

        <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
          <Plus size={16} /> {showAddForm ? 'Close Form' : 'Add New Dish'}
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', borderColor: '#bfdbfe' }}>
          <h2 className="card-title">Add Menu Item</h2>
          <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Dish Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
                <option value="Starters">Starters</option>
                <option value="Main Course">Main Course</option>
                <option value="Breads & Rice">Breads & Rice</option>
                <option value="Desserts & Beverages">Desserts & Beverages</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Dietary Tag</label>
              <select value={dietaryTag} onChange={(e) => setDietaryTag(e.target.value)} className="form-select">
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary">Save Dish</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', 'Starters', 'Main Course', 'Breads & Rice', 'Desserts & Beverages'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="btn btn-sm"
              style={{
                fontSize: '0.78rem',
                background: activeCategory === cat ? '#e23744' : '#fff',
                color: activeCategory === cat ? '#fff' : '#475569',
                borderColor: activeCategory === cat ? '#e23744' : '#cbd5e1'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Search dish to 86 / toggle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input"
          style={{ maxWidth: 280, padding: '5px 10px', fontSize: '0.85rem' }}
        />
      </div>

      {/* Menu Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Dietary</th>
              <th>Price</th>
              <th>Stock Status (1-Click 86)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menuItems
              .filter((item) => {
                const matchCategory = activeCategory === 'All' || item.category === activeCategory;
                const matchSearch =
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
                return matchCategory && matchSearch;
              })
              .map((item) => (
                <tr key={item.id} style={{ opacity: item.isAvailable ? 1 : 0.65 }}>
                  <td>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.description}</div>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    <span className={`badge ${item.dietaryTag === 'Veg' ? 'badge-success' : 'badge-danger'}`}>
                      {item.dietaryTag}
                    </span>
                  </td>
                  <td><strong>₹{item.price}</strong></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item.id)}
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: item.isAvailable ? '#ecfdf5' : '#fef2f2',
                        color: item.isAvailable ? '#065f46' : '#991b1b',
                        borderColor: item.isAvailable ? '#a7f3d0' : '#fecaca',
                        border: '1px solid',
                        cursor: 'pointer'
                      }}
                      title="Click to toggle availability"
                    >
                      {item.isAvailable ? '🟢 In Stock (Live)' : '🚫 86 / Sold Out'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
