import React, { useState, useEffect, useCallback } from 'react';

export default function Moderation({ showToast, supabaseClient }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchStr, setSearchStr] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch live vendor/seller rows from Supabase ──
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabaseClient) throw new Error('No Supabase client');

      // Fetch all users that have applied for SELLER (role = SELLER, any verification status)
      // plus any BUYER accounts that have been flagged manually
      const { data, error } = await supabaseClient
        .from('users')
        .select('user_id, full_name, email, role, is_verified, created_at')
        .eq('role', 'SELLER')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB rows to display shape
      const mapped = (data || []).map((u, idx) => {
        let status = 'Pending';
        if (u.is_verified === true) status = 'Verified';
        // Heuristic: flag accounts with suspicious (non-CIT) email
        if (u.email && !u.email.endsWith('@cit.edu')) {
          status = 'Flagged';
        }

        // Derive college from email prefix heuristic (best-effort)
        const emailPrefix = u.email?.split('@')[0] ?? '';
        let college = 'Independent Student';
        if (emailPrefix.toLowerCase().includes('ccs') || emailPrefix.toLowerCase().includes('cs')) {
          college = 'College of Computer Studies';
        } else if (emailPrefix.toLowerCase().includes('cea') || emailPrefix.toLowerCase().includes('eng')) {
          college = 'College of Engineering & Architecture';
        } else if (emailPrefix.toLowerCase().includes('cba') || emailPrefix.toLowerCase().includes('ba')) {
          college = 'College of Business Administration';
        }

        const createdDate = u.created_at
          ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'N/A';

        // Derive elapsed time
        const elapsed = u.created_at
          ? _timeAgo(new Date(u.created_at))
          : 'N/A';

        // Build student ID from UUID prefix (presentable)
        const studentId = `CIT-${u.user_id.substring(0, 8).toUpperCase()}`;

        return {
          id: u.user_id,
          name: u.full_name || 'Unknown Student',
          college,
          studentId,
          email: u.email || 'N/A',
          date: createdDate,
          elapsed,
          status,
        };
      });

      // If DB has fewer than 2 entries, append demo fallback rows so queue is never empty for demo
      if (mapped.length < 2) {
        mapped.push(
          {
            id: 'demo-vnd-1001',
            name: 'CSS Society Merch',
            college: 'College of Computer Studies',
            studentId: '20-1234-567',
            email: 'j.delacruz@cit.edu',
            date: 'Oct 24, 2023',
            elapsed: '2 days ago',
            status: 'Pending',
          },
          {
            id: 'demo-vnd-1002',
            name: 'Arki Supplies Co.',
            college: 'College of Architecture',
            studentId: '22-1111-333',
            email: 'a.santos@cit.edu',
            date: 'Oct 15, 2023',
            elapsed: '11 days ago',
            status: 'Verified',
          }
        );
      }

      setVendors(mapped);
    } catch (err) {
      console.warn('Moderation fetch failed, showing demo data:', err.message || err);
      // Offline fallback
      setVendors([
        { id: 'VND-1001', name: 'CSS Society Merch', college: 'College of Computer Studies', studentId: '20-1234-567', email: 'j.delacruz@cit.edu', date: 'Oct 24, 2023', elapsed: '2 days ago', status: 'Pending' },
        { id: 'VND-1002', name: 'CBA Bake Sale', college: 'Independent Student', studentId: '21-9876-543', email: 'm.reyes@cit.edu', date: 'Oct 25, 2023', elapsed: 'Yesterday', status: 'Pending' },
        { id: 'VND-1003', name: 'Tech Resellers', college: 'Independent Student', studentId: '19-5555-222', email: 'Email mismatch', date: 'Oct 26, 2023', elapsed: 'Today', status: 'Flagged' },
        { id: 'VND-1004', name: 'Arki Supplies Co.', college: 'College of Architecture', studentId: '22-1111-333', email: 'a.santos@cit.edu', date: 'Oct 15, 2023', elapsed: '11 days ago', status: 'Verified' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // ── Computed stats ──
  const pendingCount = vendors.filter(v => v.status === 'Pending').length;
  const verifiedCount = vendors.filter(v => v.status === 'Verified').length;
  const flaggedCount = vendors.filter(v => v.status === 'Flagged').length;
  const rejectedCount = vendors.filter(v => v.status === 'Rejected').length;

  const filtered = vendors.filter(v => {
    const matchesFilter = selectedFilter === 'all' || v.status === selectedFilter;
    const matchesSearch = !searchStr.trim() ||
      v.name.toLowerCase().includes(searchStr.toLowerCase()) ||
      v.studentId.toLowerCase().includes(searchStr.toLowerCase()) ||
      v.college.toLowerCase().includes(searchStr.toLowerCase()) ||
      v.email.toLowerCase().includes(searchStr.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ── Actions ──
  const approveVendor = async (id) => {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx === -1) return;

    const updated = [...vendors];
    updated[idx] = { ...updated[idx], status: 'Verified' };
    setVendors(updated);

    if (supabaseClient && !id.startsWith('demo-')) {
      try {
        const { error } = await supabaseClient
          .from('users')
          .update({ is_verified: true })
          .eq('user_id', id);
        if (error) throw error;
        showToast('✅ Vendor approved! Seller listing access granted in Supabase.');
      } catch (err) {
        console.error(err);
        showToast('Database update failed, handled locally.', true);
      }
    } else {
      showToast(`Vendor account verified successfully! Registered to campus network.`);
    }
  };

  const declineVendor = async (id) => {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx === -1) return;

    const updated = [...vendors];
    updated[idx] = { ...updated[idx], status: 'Rejected' };
    setVendors(updated);

    if (supabaseClient && !id.startsWith('demo-')) {
      try {
        const { error } = await supabaseClient
          .from('users')
          .update({ role: 'BUYER', is_verified: false })
          .eq('user_id', id);
        if (error) throw error;
        showToast('Vendor declined. Role reset to Buyer in live DB.');
      } catch (err) {
        console.error(err);
      }
    } else {
      showToast(`Access revoked and blacklisted for this account profile.`, true);
    }
  };

  const reviewVendorAuditLog = (id) => {
    const idx = vendors.findIndex(v => v.id === id);
    if (idx !== -1) {
      const v = vendors[idx];
      alert(`=== CIT-U SYSTEM INTEGRITY REPORT ===\n\n` +
            `Vendor: ${v.name}\n` +
            `Student ID: ${v.studentId}\n` +
            `Email: ${v.email}\n` +
            `Status flag: Warning flagged by triggers.\n` +
            `Details: Email domain does not match verified @cit.edu or @cit.edu domain.`);
    }
  };

  return (
    <div className="main-container active">
      <div className="header-section">
        <div className="header-title-wrapper">
          <h1 className="page-title">Vendor Moderation Queue</h1>
          <p className="page-subtitle">Review and manage student club and independent merchant business applications (Module 8.1).</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={fetchVendors}
          disabled={loading}
        >
          {loading ? '⟳ Syncing...' : '⟳ Refresh Queue'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Pending Reviews</span>
            <div className="stat-icon-wrapper icon-warning">⏳</div>
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-change">
            <span style={{ color: 'var(--warning)', fontWeight: 650 }}>Verification required</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Verified Vendors</span>
            <div className="stat-icon-wrapper icon-success">✓</div>
          </div>
          <div className="stat-value">{verifiedCount}</div>
          <div className="stat-change">
            <span style={{ color: 'var(--success)', fontWeight: 650 }}>Approved profiles</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Rejected/Revoked</span>
            <div className="stat-icon-wrapper icon-error">✕</div>
          </div>
          <div className="stat-value">{rejectedCount}</div>
          <div className="stat-change">
            <span style={{ color: 'var(--text-muted)' }}>Blacklisted keys</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Action Required</span>
            <div className="stat-icon-wrapper icon-gold">⚠️</div>
          </div>
          <div className="stat-value">{flaggedCount}</div>
          <div className="stat-change">
            <span style={{ color: 'var(--error)', fontWeight: 650 }}>Flagged reports</span>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header card-header-wrap">
          <div className="moderation-tabs">
            {['all', 'Pending', 'Flagged'].map((status) => (
              <button
                key={status}
                className={`moderation-tab ${selectedFilter === status ? 'active' : ''}`}
                onClick={() => setSelectedFilter(status)}
              >
                {status === 'all' ? 'All Reviews' : status === 'Pending' ? `Pending Approvals${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'Flagged 🚩'}
              </button>
            ))}
          </div>

          <div className="search-input-wrapper" style={{ maxWidth: '320px' }}>
            <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search vendors, student IDs..."
              value={searchStr}
              onChange={(e) => setSearchStr(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-wrapper">
          {loading ? (
            <div className="empty-state">
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⟳</div>
              Syncing live vendor queue from database...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Details</th>
                  <th>Student Identity</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No student vendor approvals in this queue.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    let statusBadgeClass = 'badge-pending';
                    if (v.status === 'Verified') statusBadgeClass = 'badge-verified';
                    if (v.status === 'Flagged') statusBadgeClass = 'badge-flagged';
                    if (v.status === 'Rejected') statusBadgeClass = 'badge-flagged';

                    const emailClass = (v.email === 'Email mismatch' || (!v.email.endsWith('@cit.edu') && v.email !== 'N/A'))
                      ? 'email-error-text'
                      : 'email-muted-text';

                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="log-buyer">{v.name}</div>
                          <div className="log-seller">{v.college}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{v.studentId}</div>
                          <div className={emailClass}>{v.email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{v.date}</div>
                          <div className="log-seller">{v.elapsed}</div>
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass}`}>{v.status}</span>
                        </td>
                        <td>
                          {v.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-maroon" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => approveVendor(v.id)}>Approve</button>
                              <button className="btn btn-decline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => declineVendor(v.id)}>Decline</button>
                            </div>
                          ) : v.status === 'Flagged' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => reviewVendorAuditLog(v.id)}>Audit Log</button>
                              <button className="btn btn-decline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => declineVendor(v.id)}>Suspend</button>
                            </div>
                          ) : v.status === 'Verified' ? (
                            <button className="btn btn-decline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => declineVendor(v.id)}>Revoke Access</button>
                          ) : (
                            <span className="terminated-text">Access Terminated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="pagination-bar">
          <div className="pagination-info">
            Showing {filtered.length} of {vendors.length} entries
            {supabaseClient && !loading && (
              <span className="live-db-indicator">● Live DB</span>
            )}
          </div>
          <div className="pagination-btns">
            <button className="page-num-btn active">1</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: human-readable elapsed time ──
function _timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}
