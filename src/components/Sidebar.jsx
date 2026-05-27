import React from 'react';

export default function Sidebar({ activeTab, onSwitchTab, dbConnected }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Wildcat Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      id: 'orders',
      label: 'Order Verification',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    },
    {
      id: 'inventory',
      label: 'Catalog & Inventory',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    {
      id: 'moderation',
      label: 'Wildcat Moderation',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo-container">
          <span className="brand-logo-text">TC</span>
        </div>
        <div className="brand-details">
          <span className="brand-name">TeknoyCart</span>
          <span className="brand-subtitle">Admin System v1.0</span>
        </div>
      </div>

      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onSwitchTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: dbConnected === true ? 'rgba(52, 199, 89, 0.12)' : dbConnected === false ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${dbConnected === true ? 'rgba(52,199,89,0.4)' : dbConnected === false ? 'rgba(255,159,10,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px', padding: '8px 10px', marginBottom: '10px'
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
            background: dbConnected === true ? '#34C759' : dbConnected === false ? '#FF9F0A' : '#999',
            boxShadow: dbConnected === true ? '0 0 6px rgba(52,199,89,0.8)' : 'none'
          }} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: dbConnected === true ? '#34C759' : dbConnected === false ? '#FF9F0A' : '#999' }}>
            {dbConnected === true ? 'Supabase Live' : dbConnected === false ? 'Offline Mode' : 'Connecting…'}
          </span>
        </div>
        <div>Cebu Institute of Technology</div>
        <div style={{ color: 'var(--cit-gold)', fontWeight: 700 }}>Wildcats Marketplace</div>
        <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.8 }}>Capstone Team 45</div>
      </div>
    </aside>
  );
}
