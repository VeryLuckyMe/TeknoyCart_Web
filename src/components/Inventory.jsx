import React, { useState, useEffect } from 'react';

export default function Inventory({ products, setProducts, showToast, supabaseClient, onSync, currentRole, currentSellerId }) {
  const [selectedInvCategory, setSelectedInvCategory] = useState('all');
  const [searchStr, setSearchStr] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form states for Add Product
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('Books');
  const [addPrice, setAddPrice] = useState('');
  const [addVariations, setAddVariations] = useState('');
  const [addStock, setAddStock] = useState('');

  const handleSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync();
      showToast('✅ Synced live inventory catalog from Supabase!');
    } catch (e) {
      showToast('Failed to sync catalog.', true);
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(item => {
    // category filter
    const matchesCategory = selectedInvCategory === 'all' || 
      (selectedInvCategory === 'low-stock' ? item.stock <= 5 : item.category === selectedInvCategory);

    // search filter
    const matchesSearch = !searchStr.trim() || 
      item.name.toLowerCase().includes(searchStr.toLowerCase()) ||
      item.id.toLowerCase().includes(searchStr.toLowerCase()) ||
      item.category.toLowerCase().includes(searchStr.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const adjustStock = async (id) => {
    const idx = products.findIndex(item => item.id === id);
    if (idx === -1) return;

    const item = products[idx];
    const newStock = prompt(`Update stock quantity for "${item.name}":`, item.stock);
    if (newStock !== null) {
      const parsed = parseInt(newStock);
      if (!isNaN(parsed) && parsed >= 0) {
        const updated = [...products];
        updated[idx] = { ...updated[idx], stock: parsed };
        setProducts(updated);

        if (supabaseClient && item._supabaseId) {
          try {
            const { data: variants } = await supabaseClient
              .from('product_variants')
              .select('variant_id')
              .eq('product_id', item._supabaseId)
              .limit(1);

            if (variants && variants.length > 0) {
              const { error } = await supabaseClient
                .from('inventory')
                .update({ stock_qty: parsed, last_updated: new Date().toISOString() })
                .eq('variant_id', variants[0].variant_id);
              if (error) throw error;
              showToast(`✅ Stock updated for "${item.name}" → ${parsed} units in Supabase!`);
            } else {
              showToast(`Updated stock locally for "${item.name}" to ${parsed}.`);
            }
          } catch (err) {
            console.warn('Supabase stock update failed:', err);
            showToast(`Updated stock locally for "${item.name}" to ${parsed}.`);
          }
        } else {
          showToast(`Updated stock quantity for "${item.name}" to ${parsed}.`);
        }
      } else {
        alert('Invalid stock quantity entered.');
      }
    }
  };

  const deleteProduct = async (id) => {
    const idx = products.findIndex(item => item.id === id);
    if (idx === -1) return;

    const item = products[idx];
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);

    if (supabaseClient && item._supabaseId) {
      try {
        const { error } = await supabaseClient
          .from('products')
          .delete()
          .eq('product_id', item._supabaseId);
        
        if (error) throw error;
        showToast(`🗑️ Product "${item.name}" removed from live Supabase catalog!`);
      } catch (err) {
        console.warn('Supabase DB delete failed, removed locally.', err);
        showToast(`Product "${item.name}" removed from local view.`);
      }
    } else {
      showToast(`Product "${item.name}" removed from catalog.`);
    }
  };

  const simulateExcelExport = () => {
    try {
      const headers = ['Product ID', 'Name', 'Category', 'Price', 'Variations', 'Stock'];
      const rows = products.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.price,
        `"${p.variations.replace(/"/g, '""')}"`,
        p.stock
      ]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "teknoycart_inventory_checklist.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✅ Successfully downloaded inventory checklist: teknoycart_inventory_checklist.csv!');
    } catch (e) {
      showToast('Failed to export inventory spreadsheet.', true);
    }
  };

  const saveNewProduct = async () => {
    if (!addName.trim() || !addPrice || !addStock) {
      showToast('Please fill in all required fields marked with *', true);
      return;
    }

    const price = parseFloat(addPrice);
    const stock = parseInt(addStock);
    if (isNaN(price) || isNaN(stock)) {
      showToast('Price and Stock must be valid numbers!', true);
      return;
    }

    const localId = 'PRD-' + Math.floor(10000 + Math.random() * 90000);
    const CATEGORY_NAME_TO_ID = { 'Books': 1, 'Drawing Tools': 2, 'Uniforms': 3, 'Electronics': 4, 'Others': 5 };
    const newProd = {
      id: localId,
      name: addName.trim(),
      category: addCategory,
      price,
      variations: addVariations.trim() || 'Standard',
      stock,
    };

    setProducts([newProd, ...products]);
    setShowAddModal(false);

    // Reset form
    setAddName(''); setAddCategory('Books'); setAddPrice(''); setAddVariations(''); setAddStock('');

    if (supabaseClient) {
      try {
        let sellerId = currentSellerId;

        // Fallback checks if currentSellerId is empty
        if (!sellerId) {
          const { data: sellers } = await supabaseClient
            .from('users')
            .select('user_id')
            .eq('role', 'SELLER')
            .limit(1);

          sellerId = sellers?.[0]?.user_id;
        }

        if (!sellerId) throw new Error('No seller account found in database. Run seed script first.');

        const { data: inserted, error: insertErr } = await supabaseClient
          .from('products')
          .insert({
            seller_id: sellerId,
            name: newProd.name,
            description: addVariations.trim() || 'Seller-listed product via Web storefront.',
            base_price: price,
            category_id: CATEGORY_NAME_TO_ID[addCategory] || 5,
            status: 'ACTIVE',
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Create default variant + inventory row
        const { data: variant, error: varErr } = await supabaseClient
          .from('product_variants')
          .insert({
            product_id: inserted.product_id,
            variant_name: 'Standard',
            variant_value: addVariations.trim() || 'Default',
            additional_price: 0,
            sku: 'SKU-SEL-' + inserted.product_id.substring(0, 6).toUpperCase(),
          })
          .select()
          .single();

        if (varErr) throw varErr;

        await supabaseClient.from('inventory').insert({
          variant_id: variant.variant_id,
          stock_qty: stock,
          reserved_qty: 0,
          low_stock_threshold: 3,
        });

        // Update local item with supabase UUID
        setProducts(prev => prev.map(p =>
          p.id === localId ? { ...p, _supabaseId: inserted.product_id } : p
        ));

        showToast(`✅ "${newProd.name}" listed in live Supabase catalog!`);
      } catch (err) {
        console.warn('Supabase catalog insert failed, listed locally only.', err.message || err);
        showToast(`Product listed locally only. DB error: ${err.message || 'unknown'}`, true);
      }
    } else {
      showToast(`Product "${newProd.name}" successfully listed to active catalog (offline mode)!`);
    }
  };

  return (
    <div className="main-container active">
      <div className="header-section">
        <div className="header-title-wrapper">
          <h1 className="page-title">
            {currentRole === 'SELLER' ? 'My Store Catalog' : 'Catalog & Inventory'}
          </h1>
          <p className="page-subtitle">
            {currentRole === 'SELLER' 
              ? 'Manage your personal pre-loved product list, update stock quantities, and view live feedback (FR-09).'
              : 'Track listed items, configure stock variances, and add direct retail inventory (SRS FR-09).'}
          </p>
        </div>
        <div className="header-actions">
          {onSync && (
            <button
              className="btn btn-outline"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '⟳ Syncing...' : '⟳ Sync Catalog'}
            </button>
          )}
          <button className="btn btn-outline" onClick={simulateExcelExport}>Export Spreadsheet</button>
          <button className="btn btn-maroon" onClick={() => setShowAddModal(true)}>Add Product</button>
        </div>
      </div>


      <div className="content-card">
        <div className="card-header card-header-column">
          <div className="search-filter-bar-no-margin">
            <div className="search-input-wrapper">
              <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="search-input-field"
                placeholder="Search by product name, category, or ID..."
                value={searchStr}
                onChange={(e) => setSearchStr(e.target.value)}
              />
            </div>
            
            <div className="horizontal-tabs">
              {['all', 'Apparel', 'Electronics', 'Books', 'Drawing Tools', 'low-stock'].map((cat) => (
                <button
                  key={cat}
                  className={`tab-btn ${selectedInvCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedInvCategory(cat)}
                >
                  {cat === 'all' ? 'All Products' : cat === 'low-stock' ? 'Low Stock ⚠️' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Product Details</th>
                <th>Category</th>
                <th>Price</th>
                <th>Variations</th>
                <th>Stock Qty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No matching inventory catalog items.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const initialChar = item.name.charAt(0).toUpperCase();
                  let colorBg = 'var(--cit-maroon)';
                  if (item.category === 'Books') colorBg = 'var(--cit-gold-dark)';
                  if (item.category === 'Electronics') colorBg = 'var(--info)';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="table-thumbnail" style={{ background: colorBg }}>
                          {initialChar}
                        </div>
                      </td>
                      <td>
                        <div className="log-buyer">{item.name}</div>
                        <div className="log-time">ID: {item.id}</div>
                      </td>
                      <td>{item.category}</td>
                      <td className="item-price">
                        ₱ {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="variation-badge">
                          {item.variations}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {item.stock} {item.stock <= 5 && (
                          <span className="badge badge-flagged" style={{ padding: '2px 6px', fontSize: '9px', marginLeft: '8px' }}>LOW</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => adjustStock(item.id)}>Stock</button>
                          <button className="btn btn-decline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => deleteProduct(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showAddModal && (
        <div className="floating-modal">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Product to Catalog</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-form">
              <div className="reference-number-group">
                <label className="input-label" htmlFor="pname">Product Name *</label>
                <input
                  type="text"
                  className="input-field"
                  id="pname"
                  placeholder="e.g. Official Maroon Jacket"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <div className="reference-number-group">
                <label className="input-label" htmlFor="pcat">Category *</label>
                <select
                  className="input-field"
                  id="pcat"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                >
                  <option value="Apparel">Apparel</option>
                  <option value="Books">Books</option>
                  <option value="Drawing Tools">Drawing Tools</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="reference-number-group">
                <label className="input-label" htmlFor="pprice">Price (₱) *</label>
                <input
                  type="number"
                  className="input-field"
                  id="pprice"
                  placeholder="e.g. 500.00"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                />
              </div>
              <div className="reference-number-group">
                <label className="input-label" htmlFor="pvars">Variations</label>
                <input
                  type="text"
                  className="input-field"
                  id="pvars"
                  placeholder="e.g. Small, Medium, Large"
                  value={addVariations}
                  onChange={(e) => setAddVariations(e.target.value)}
                />
              </div>
              <div className="reference-number-group">
                <label className="input-label" htmlFor="pstock">Stock Quantity *</label>
                <input
                  type="number"
                  className="input-field"
                  id="pstock"
                  placeholder="e.g. 15"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                />
              </div>
              <div className="modal-footer-actions">
                <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn-maroon" onClick={saveNewProduct}>Save Product</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
