import React, { useState } from 'react';

export default function Orders({ orders, setOrders, showToast, supabaseClient }) {
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [refNumInput, setRefNumInput] = useState('');

  const filteredOrders = orders.filter(o => {
    if (selectedFilter === 'all') return true;
    return o.status === selectedFilter;
  });

  const activeOrder = filteredOrders[activeOrderIndex];

  const handleSelectOrder = (index) => {
    setActiveOrderIndex(index);
    // Reset reference number input to match chosen order's active value
    const chosen = filteredOrders[index];
    if (chosen) {
      setRefNumInput(chosen.refNum || '');
    }
  };

  const handleFilterChange = (status) => {
    setSelectedFilter(status);
    setActiveOrderIndex(0);
    const firstMatch = orders.find(o => status === 'all' || o.status === status);
    if (firstMatch) {
      setRefNumInput(firstMatch.refNum || '');
    } else {
      setRefNumInput('');
    }
  };

  const verifyP2PPayment = async () => {
    if (!refNumInput.trim()) {
      showToast('GCash Reference Number is required for validation!', true);
      return;
    }

    // Find index in main list
    const originalIndex = orders.findIndex(x => x.id === activeOrder.id);
    if (originalIndex === -1) return;

    const updated = [...orders];
    updated[originalIndex].status = 'COMPLETED';
    updated[originalIndex].refNum = refNumInput;
    setOrders(updated);

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('orders')
          .update({ status: 'COMPLETED', pickup_location: 'Library Lobby' })
          .eq('order_id', activeOrder.id);
        
        if (error) throw error;
        showToast('Payment verified successfully in live Supabase DB!');
      } catch (err) {
        console.warn('Supabase DB update failed, loaded locally.', err);
      }
    } else {
      showToast('GCash payment reference verified! Item released for meetup.');
    }
  };

  const verifyReservedPayment = (oId) => {
    const originalIndex = orders.findIndex(x => x.id === oId);
    if (originalIndex === -1) return;

    const updated = [...orders];
    updated[originalIndex].status = 'COMPLETED';
    updated[originalIndex].refNum = 'MEETUP-CASH';
    setOrders(updated);
    showToast('Meetup order completed successfully!');
  };

  const declinePayment = (oId) => {
    const originalIndex = orders.findIndex(x => x.id === oId);
    if (originalIndex === -1) return;

    const updated = [...orders];
    updated[originalIndex].status = 'REJECTED';
    updated[originalIndex].refNum = '';
    setOrders(updated);
    showToast('Payment declined. Student notified to upload a valid GCash receipt.', true);
  };

  return (
    <div className="main-container active">
      <div className="header-section" style={{ marginBottom: '24px' }}>
        <div className="header-title-wrapper">
          <h1 className="page-title">Order Verification Hub</h1>
          <p className="page-subtitle">Confirm P2P GCash transfers, cross-check reference codes, and finalize handoffs (FR-18/FR-19).</p>
        </div>
      </div>

      <div className="two-column-layout">
        {/* Left Column: Orders Cards List */}
        <div>
          <div className="horizontal-tabs" style={{ marginBottom: '20px' }}>
            <button
              className={`tab-btn ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All Orders
            </button>
            <button
              className={`tab-btn ${selectedFilter === 'PAYMENT_SUBMITTED' ? 'active' : ''}`}
              onClick={() => handleFilterChange('PAYMENT_SUBMITTED')}
            >
              Payment Verification
            </button>
            <button
              className={`tab-btn ${selectedFilter === 'READY_FOR_PICKUP' ? 'active' : ''}`}
              onClick={() => handleFilterChange('READY_FOR_PICKUP')}
            >
              Ready for Pickup
            </button>
            <button
              className={`tab-btn ${selectedFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => handleFilterChange('COMPLETED')}
            >
              Completed
            </button>
          </div>

          <div className="orders-scroll-list">
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                No active orders found in this status category.
              </div>
            ) : (
              filteredOrders.map((o, idx) => {
                const isActive = activeOrder && o.id === activeOrder.id;
                return (
                  <div
                    className={`order-card-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectOrder(idx)}
                    key={o.id}
                  >
                    <div className="order-card-header">
                      <span className="order-card-id">{o.displayId || o.id}</span>
                      <span className="order-card-time">{o.time}</span>
                    </div>
                    <div className="order-card-buyer">Buyer: {o.buyer}</div>
                    <div className="order-card-items-desc">{o.items.map(i => i.name).join(', ')}</div>
                    <div className="order-card-footer">
                      <span className="order-card-price">₱ {o.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className={`badge ${o.status === 'COMPLETED' ? 'badge-verified' : o.status === 'READY_FOR_PICKUP' || o.status === 'APPROVED' ? 'badge-reserved' : 'badge-pending'}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Details Pane */}
        <div className="order-details-panel">
          {activeOrder ? (
            <div className="order-details-scroll">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="page-title" style={{ fontSize: '24px', marginBottom: '4px' }}>Order Details</h2>
                  <p className="order-card-time">{activeOrder.displayId || activeOrder.id} | Submitted {activeOrder.time}</p>
                </div>
                <span className={`badge ${activeOrder.status === 'COMPLETED' ? 'badge-verified' : activeOrder.status === 'READY_FOR_PICKUP' || activeOrder.status === 'APPROVED' ? 'badge-reserved' : 'badge-pending'}`}>
                  {activeOrder.status}
                </span>
              </div>

              <div>
                <h3 className="order-details-section-title">Buyer Student Info</h3>
                <div className="buyer-info-grid">
                  <div className="buyer-info-item">
                    <span className="buyer-info-label">Full Name</span>
                    <span className="buyer-info-value">{activeOrder.buyer}</span>
                  </div>
                  <div className="buyer-info-item">
                    <span className="buyer-info-label">Student ID</span>
                    <span className="buyer-info-value">{activeOrder.studentId}</span>
                  </div>
                  <div className="buyer-info-item">
                    <span className="buyer-info-label">Department</span>
                    <span className="buyer-info-value">{activeOrder.dept}</span>
                  </div>
                  <div className="buyer-info-item">
                    <span className="buyer-info-label">Contact</span>
                    <span className="buyer-info-value">{activeOrder.contact}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="order-details-section-title">Order Items</h3>
                <div className="order-items-list">
                  {activeOrder.items.map((item, index) => (
                    <div className="order-item-row" key={index}>
                      <div className="order-item-details">
                        <span className="order-item-name">{item.name}</span>
                        <span className="order-item-desc">{item.desc}</span>
                      </div>
                      <span className="order-item-price">₱ {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="order-details-section-title">Payment Verification (GCash P2P)</h3>
                {activeOrder.status === 'COMPLETED' ? (
                  <div className="payment-validation-box" style={{ backgroundColor: 'var(--success-bg)', borderColor: 'var(--success)' }}>
                    <div className="expected-amount-container">
                      <span className="buyer-info-label">Expected Amount</span>
                      <span className="expected-amount-value" style={{ color: 'var(--success)' }}>₱ {activeOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '14px' }}>
                      ✓ Verified Reference Number: <strong>{activeOrder.refNum}</strong>
                    </div>
                  </div>
                ) : (activeOrder.status === 'READY_FOR_PICKUP' || activeOrder.status === 'APPROVED') ? (
                  <div className="payment-validation-box" style={{ backgroundColor: 'hsl(200, 100%, 96%)', borderColor: 'hsl(200, 100%, 30%)' }}>
                    <div className="expected-amount-container">
                      <span className="buyer-info-label">Expected Amount</span>
                      <span className="expected-amount-value" style={{ color: 'hsl(200, 100%, 30%)' }}>₱ {activeOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'hsl(200, 100%, 25%)', lineHeight: '1.5' }}>
                      This transaction is flagged as <strong>Cash on Meetup / Reserved</strong>. GCash proof uploading was bypassed. Please exchange items at standard campus landmarks (e.g. Canteen, CEA Benches).
                    </div>
                    <div className="details-actions">
                      <button className="btn btn-maroon" onClick={() => verifyReservedPayment(activeOrder.id)}>Mark Cash Received & Completed</button>
                    </div>
                  </div>
                ) : (
                  <div className="payment-validation-box">
                    <div className="expected-amount-container">
                      <span className="buyer-info-label">Expected Amount</span>
                      <span className="expected-amount-value">₱ {activeOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="uploaded-receipt-preview" onClick={() => setLightboxSrc(activeOrder.receipt)}>
                      <img src={activeOrder.receipt} className="receipt-thumbnail" alt="Receipt Thumbnail" />
                      <div className="receipt-label-wrapper">
                        <span className="receipt-title">Student Uploaded GCash Receipt</span>
                        <span className="receipt-subtitle">Click to expand high-fidelity lightbox</span>
                      </div>
                    </div>

                    <div className="reference-number-group">
                      <label className="input-label" htmlFor="ref-input">Enter GCash Reference Number *</label>
                      <input
                        type="text"
                        className="input-field"
                        id="ref-input"
                        placeholder="e.g. 9028 1123 4567"
                        value={refNumInput}
                        onChange={(e) => setRefNumInput(e.target.value)}
                      />
                    </div>

                    <div className="details-actions">
                      <button className="btn btn-decline" onClick={() => declinePayment(activeOrder.id)}>Decline & Request New</button>
                      <button className="btn btn-maroon" onClick={verifyP2PPayment}>Verify & Complete</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Select an order card to review student validations.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxSrc && (
        <div className="lightbox-modal" onClick={() => setLightboxSrc(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>&times;</button>
            <img src={lightboxSrc} alt="GCash Receipt" className="lightbox-image" />
            <p style={{ color: 'white', fontSize: '14px', fontWeight: 500, fontFamily: 'Outfit' }}>
              Reference Lightbox: {activeOrder?.buyer} ({activeOrder?.studentId})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
