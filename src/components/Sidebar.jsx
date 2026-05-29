
export default function Sidebar({ activeTab, onSwitchTab, dbConnected, currentRole, onToggleRole, currentUser, onLogout }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: currentRole === 'SELLER' ? 'Seller Analytics' : 'Wildcat Dashboard',
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
      label: currentRole === 'SELLER' ? 'Incoming Orders' : 'Order Verification',
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
      label: currentRole === 'SELLER' ? 'My Store Catalog' : 'Catalog & Inventory',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    // Only Administrators can moderate items
    ...(currentRole === 'ADMIN' ? [{
      id: 'moderation',
      label: 'Wildcat Moderation',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }] : [])
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo-container">
          <span className="brand-logo-text">TC</span>
        </div>
        <div className="brand-details">
          <span className="brand-name">TeknoyCart</span>
          <span className="brand-subtitle">
            {currentRole === 'SELLER' ? 'Wildcat Storefront' : 'Admin System v1.0'}
          </span>
        </div>
      </div>

      {/* Role Selection Switcher Deck (MEMORABLE MULTI-STATE SLIDER CAPSULE) */}
      {!currentUser && (
        <div className="role-switcher-container">
          <div className={`role-slider-glider ${currentRole === 'SELLER' ? 'right' : 'left'}`} />
          <button
            className={`role-switcher-btn ${currentRole === 'ADMIN' ? 'active' : ''}`}
            onClick={() => {
              onToggleRole('ADMIN');
              onSwitchTab('dashboard');
            }}
          >
            🔑 Admin
          </button>
          <button
            className={`role-switcher-btn ${currentRole === 'SELLER' ? 'active' : ''}`}
            onClick={() => {
              onToggleRole('SELLER');
              onSwitchTab('dashboard');
            }}
          >
            🎒 Seller
          </button>
        </div>
      )}

      <nav className="sidebar-nav">
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

      {currentUser && (
        <div className="sidebar-profile-capsule">
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-avatar">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-meta">
              <div className="sidebar-profile-name">{currentUser.name}</div>
              <div className="sidebar-profile-role">{currentUser.role}</div>
            </div>
          </div>
          <button className="btn-sidebar-logout" onClick={onLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div className={`db-status-pill ${dbConnected === true ? 'live' : dbConnected === false ? 'offline' : 'connecting'}`}>
          <span className="db-status-indicator" />
          <span className="db-status-label">
            {dbConnected === true ? 'Supabase Live' : dbConnected === false ? 'Offline Mode' : 'Connecting…'}
          </span>
        </div>
        <div className="sidebar-footer-school">Cebu Institute of Technology</div>
        <div className="sidebar-footer-brand">Wildcats Marketplace</div>
        <div className="sidebar-footer-capstone">Capstone Team 45</div>
      </div>
    </aside>
  );
}

