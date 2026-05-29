import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Inventory from './components/Inventory';
import Moderation from './components/Moderation';
import { supabase } from './services/supabase';

// ── Fallback demo data (used when Supabase tables are empty or unreachable) ──
const FALLBACK_PRODUCTS = [
  { id: 'PRD-29381', name: 'Official Engineering Shirt',        category: 'Uniforms',      price: 350.00,  variations: 'S, M, L, XL',  stock: 142, seller_id: 'usr-seller-1' },
  { id: 'PRD-11024', name: 'Calculus Early Transcendentals',   category: 'Books',         price: 1200.00, variations: '9th Ed., Used', stock: 3, seller_id: 'usr-seller-1' },
  { id: 'PRD-99832', name: 'Arduino Uno R3 Starter Kit',       category: 'Electronics',   price: 850.00,  variations: 'Base, + Sensors', stock: 12, seller_id: 'usr-seller-2' },
  { id: 'PRD-45512', name: 'Engineering Drawing Table',         category: 'Drawing Tools', price: 450.00,  variations: 'Adjustable',    stock: 8, seller_id: 'usr-seller-1' },
  { id: 'PRD-77201', name: 'CIT-U PE Uniform (Medium)',        category: 'Uniforms',      price: 250.00,  variations: 'Unisex, M',     stock: 5, seller_id: 'usr-seller-2' },
];

const FALLBACK_ORDERS = [
  {
    id: 'ORD-2024-8891', buyer: 'Maria Santos', studentId: '19-1234-567',
    dept: 'College of Computer Studies', contact: '0912 345 6789', time: '2 mins ago',
    status: 'PAYMENT_SUBMITTED', amount: 1450.00, seller_id: 'usr-seller-1',
    items: [
      { name: 'Official College Uniform (Female)', desc: 'Size: Medium | Qty: 1', price: 1200.00 },
      { name: 'CIT-U Executive Lanyard',           desc: 'Color: Maroon | Qty: 2', price: 250.00 },
    ],
    receipt: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300', refNum: ''
  },
  {
    id: 'ORD-2024-8890', buyer: 'John Doe', studentId: '20-9876-543',
    dept: 'College of Engineering & Architecture', contact: '0923 456 7890', time: '1 hour ago',
    status: 'READY_FOR_PICKUP', amount: 450.00, seller_id: 'usr-seller-2',
    items: [
      { name: 'Official Engineering Shirt', desc: 'Size: Large | Qty: 1', price: 350.00 },
      { name: 'CIT-U Sticker Pack',         desc: 'Qty: 1',              price: 100.00 },
    ],
    receipt: '', refNum: ''
  },
  {
    id: 'ORD-2024-8889', buyer: 'Jane Smith', studentId: '21-5555-123',
    dept: 'College of Business Administration', contact: '0934 567 8901', time: '3 hours ago',
    status: 'PAYMENT_SUBMITTED', amount: 850.00, seller_id: 'usr-seller-1',
    items: [
      { name: 'Calculus Early Transcendentals', desc: '9th Ed. | Qty: 1', price: 850.00 },
    ],
    receipt: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300', refNum: ''
  },
];

// ── Helper: map category_id integer → human readable label ──
const CATEGORY_MAP = {
  1: 'Books',
  2: 'Drawing Tools',
  3: 'Uniforms',
  4: 'Electronics',
  5: 'Others',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState('ADMIN'); // 'ADMIN' or 'SELLER'
  const [products, setProducts]   = useState(FALLBACK_PRODUCTS);
  const [orders, setOrders]       = useState(FALLBACK_ORDERS);
  const [toast, setToast]         = useState(null);
  const [dbConnected, setDbConnected] = useState(null); // null=checking, true=live, false=offline
  const [currentSellerId, setCurrentSellerId] = useState('usr-seller-1'); // Default seller scope for seller mode

  // ── Toast helper ──
  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Standalone Supabase Sync Callback ──
  const syncSupabase = useCallback(async () => {
    try {
      // 1. Fetch products joined with variants + inventory for stock qty
      let query = supabase
        .from('products')
        .select(`
          product_id,
          name,
          description,
          base_price,
          status,
          category_id,
          seller_id,
          product_variants (
            variant_id,
            variant_name,
            variant_value,
            additional_price,
            inventory (
              stock_qty
            )
          )
        `)
        .eq('status', 'ACTIVE');

      // If in seller role, we can surgically filter to show ONLY their products
      if (currentRole === 'SELLER' && currentSellerId) {
        query = query.eq('seller_id', currentSellerId);
      }

      const { data: prodData, error: prodErr } = await query.order('created_at', { ascending: false });

      if (prodErr) throw prodErr;

      if (prodData && prodData.length > 0) {
        const formatted = prodData.map((p, idx) => {
          const variants = p.product_variants || [];
          const varLabel = variants.length > 0
            ? variants.map(v => v.variant_value).filter(v => v !== 'Default').join(', ') || 'Standard'
            : 'Standard';

          const totalStock = variants.reduce((acc, v) => {
            const inv = v.inventory;
            return acc + (Array.isArray(inv) ? inv.reduce((a, i) => a + (i.stock_qty || 0), 0) : (inv?.stock_qty || 0));
          }, 0);

          return {
            id: `PRD-${String(idx + 1).padStart(5, '0')}`,
            _supabaseId: p.product_id,
            name: p.name,
            category: CATEGORY_MAP[p.category_id] || 'Others',
            price: parseFloat(p.base_price || 0),
            variations: varLabel,
            stock: totalStock || 12,
            seller_id: p.seller_id,
          };
        });

        setProducts(formatted);
        setDbConnected(true);
        console.log(`✅ Synced ${formatted.length} products for role ${currentRole}`);
      } else {
        // No products found in DB for role, show either fallback filtered or empty array
        if (currentRole === 'SELLER') {
          setProducts(FALLBACK_PRODUCTS.filter(p => p.seller_id === currentSellerId));
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
        setDbConnected(true);
      }

      // 2. Fetch orders with relational joins for real identities, item names, and proofs
      let ordersQuery = supabase
        .from('orders')
        .select(`
          order_id,
          total_amount,
          status,
          pickup_location,
          created_at,
          buyer_id,
          seller_id,
          quantity,
          unit_price,
          buyer:users!buyer_id (
            full_name,
            email
          ),
          product_variants (
            variant_name,
            variant_value,
            products (
              name,
              description
            )
          ),
          payment_proofs (
            image_url,
            status
          )
        `);

      if (currentRole === 'SELLER' && currentSellerId) {
        ordersQuery = ordersQuery.eq('seller_id', currentSellerId);
      }

      const { data: orderData, error: orderErr } = await ordersQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (!orderErr && orderData && orderData.length > 0) {
        const formattedOrders = orderData.map((o, idx) => {
          const buyerProfile = o.buyer || {};
          const buyerName = buyerProfile.full_name || 'Wildcat Student Buyer';
          const buyerEmail = buyerProfile.email || 'wildcat.buyer@cit.edu';
          const studentId = o.buyer_id
            ? `CIT-${o.buyer_id.substring(0, 8).toUpperCase()}`
            : `CIT-100${idx + 1}`;
          
          const variant = o.product_variants || {};
          const product = variant.products || {};
          const itemName = product.name || 'Campus Merchandise';
          const itemDesc = `Size/Type: ${variant.variant_value || 'Default'} | Qty: ${o.quantity}`;
          
          const receiptUrl = (o.payment_proofs && o.payment_proofs.length > 0) 
            ? o.payment_proofs[0].image_url 
            : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300';

          return {
            id: o.order_id,
            displayId: `ORD-${o.order_id?.substring(0, 8).toUpperCase() || idx}`,
            buyer: buyerName,
            studentId: studentId,
            dept: buyerEmail.endsWith('@cit.edu') ? 'College of Computer Studies' : 'College of Engineering & Architecture',
            contact: '09' + String(10000000 + (idx * 179) % 90000000), 
            time: new Date(o.created_at).toLocaleDateString(),
            status: o.status,
            amount: parseFloat(o.total_amount || 0),
            items: [{ name: itemName, desc: itemDesc, price: parseFloat(o.unit_price || 0) }],
            receipt: receiptUrl,
            refNum: '',
            seller_id: o.seller_id,
          };
        });
        setOrders(formattedOrders);
      } else {
        if (currentRole === 'SELLER') {
          setOrders(FALLBACK_ORDERS.filter(o => o.seller_id === currentSellerId));
        } else {
          setOrders(FALLBACK_ORDERS);
        }
      }

    } catch (err) {
      setDbConnected(false);
      console.warn('⚠️ Supabase sync exception, loaded fallback static view.', err);
    }
  }, [currentRole, currentSellerId]);

  // ── Supabase initial sync and sync on role changes ──
  useEffect(() => {
    syncSupabase();
  }, [syncSupabase, currentRole]);

  // Hook into getting a real seller ID from the active users list to make seller view organic
  useEffect(() => {
    const fetchRealSeller = async () => {
      try {
        const { data: sellers } = await supabase
          .from('users')
          .select('user_id')
          .eq('role', 'SELLER')
          .limit(1);
        if (sellers && sellers.length > 0) {
          setCurrentSellerId(sellers[0].user_id);
        }
      } catch (e) {
        console.warn('Could not locate dynamic seller ID.', e);
      }
    };
    if (dbConnected) {
      fetchRealSeller();
    }
  }, [dbConnected]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            products={products} 
            orders={orders} 
            showToast={showToast} 
            dbConnected={dbConnected} 
            supabaseClient={supabase} 
            currentRole={currentRole}
          />
        );
      case 'orders':
        return (
          <Orders 
            orders={orders} 
            setOrders={setOrders} 
            showToast={showToast} 
            supabaseClient={supabase} 
            currentRole={currentRole}
          />
        );
      case 'inventory':
        return (
          <Inventory 
            products={products} 
            setProducts={setProducts} 
            showToast={showToast} 
            supabaseClient={supabase} 
            onSync={syncSupabase} 
            currentRole={currentRole}
            currentSellerId={currentSellerId}
          />
        );
      case 'moderation':
        return <Moderation showToast={showToast} supabaseClient={supabase} />;
      default:
        return (
          <Dashboard 
            products={products} 
            orders={orders} 
            showToast={showToast} 
            dbConnected={dbConnected} 
            supabaseClient={supabase} 
            currentRole={currentRole}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        onSwitchTab={setActiveTab} 
        dbConnected={dbConnected} 
        currentRole={currentRole}
        onToggleRole={setCurrentRole}
      />

      <main className="main-wrapper">
        {renderActiveTab()}
      </main>

      {toast && (
        <div className={`admin-toast ${toast.isError ? 'error' : 'success'}`}>
          <span className="toast-icon">{toast.isError ? '✕' : '🛡️'}</span>
          <span id="toast-text">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

