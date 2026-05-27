import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chmtvasbhkbrvydbajnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXR2YXNiaGticnZ5ZGJham5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjMwMDgsImV4cCI6MjA5NTMzOTAwOH0.IJJIrh-dr4xRoXPPeBJoN_pVVHrNY4db5E1VY1Czj3I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('🌱 Starting Supabase database seeding procedure...');

  try {
    // 1. Seed Categories Table
    const categoriesToInsert = [
      { category_name: 'Books', icon_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100' },
      { category_name: 'Drawing Tools', icon_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=100' },
      { category_name: 'Uniforms', icon_url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=100' },
      { category_name: 'Electronics', icon_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=100' },
      { category_name: 'Others', icon_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100' }
    ];

    console.log('🔄 Checking categories table...');
    const { data: existingCats, error: catError } = await supabase
      .from('categories')
      .select('*');
    
    if (catError) {
      console.warn('⚠️ categories query failed (perhaps RLS or tables are not created yet). Proceeding anyway...', catError);
    }

    const currentCatNames = existingCats ? existingCats.map(c => c.category_name) : [];
    const missingCats = categoriesToInsert.filter(c => !currentCatNames.includes(c.category_name));

    if (missingCats.length > 0) {
      const { error: catInsertError } = await supabase
        .from('categories')
        .insert(missingCats);
      if (catInsertError) throw catInsertError;
      console.log(`✅ Successfully seeded ${missingCats.length} new categories!`);
    } else {
      console.log('ℹ️ Categories table already fully populated.');
    }

    // 2. Fetch categories to link products
    const { data: allCats } = await supabase.from('categories').select('*');
    const catMap = {};
    if (allCats) {
      allCats.forEach(c => {
        catMap[c.category_name] = c.category_id;
      });
    }

    // 3. Seed Users Table
    console.log('🔄 Checking users table...');
    const demoUsers = [
      {
        full_name: 'CSS Society Merch',
        email: 'css.merch@cit.edu',
        password_hash: '$2a$12$VwT.l.mockhashforcapstonepresentationonly123',
        role: 'SELLER',
        is_verified: true
      },
      {
        full_name: 'Wildcat Student Buyer',
        email: 'wildcat.buyer@my.cit.edu',
        password_hash: '$2a$12$VwT.l.mockhashforcapstonepresentationonly123',
        role: 'BUYER',
        is_verified: true
      }
    ];

    const { data: existingUsers } = await supabase.from('users').select('*');
    const currentUserEmails = existingUsers ? existingUsers.map(u => u.email) : [];
    const missingUsers = demoUsers.filter(u => !currentUserEmails.includes(u.email));

    if (missingUsers.length > 0) {
      const { data: insertedUsers, error: userInsertError } = await supabase
        .from('users')
        .insert(missingUsers)
        .select();
      if (userInsertError) throw userInsertError;
      console.log(`✅ Successfully seeded ${insertedUsers.length} institutional users!`);
    } else {
      console.log('ℹ️ Users table already contains presentation profiles.');
    }

    // 4. Fetch Users for foreign key links
    const { data: allUsers } = await supabase.from('users').select('*');
    const seller = allUsers ? allUsers.find(u => u.role === 'SELLER') : null;
    const sellerId = seller ? seller.user_id : '3b9272fa-7fcf-49b0-9db0-3027b1406d39'; // fallback uuid

    // 5. Seed Products Table
    console.log('🔄 Checking products table...');
    const demoProducts = [
      {
        seller_id: sellerId,
        category_id: catMap['Drawing Tools'] || 2,
        name: 'Engineering Drawing Table',
        description: 'Official CIT-U drawing board with adjustable stands. Very clean, lightly used for one semester.',
        base_price: 450.00,
        status: 'ACTIVE'
      },
      {
        seller_id: sellerId,
        category_id: catMap['Uniforms'] || 3,
        name: 'CIT-U PE Uniform (Medium)',
        description: 'Complete set of official CIT-U physical education uniform. Unisex design, medium size.',
        base_price: 250.00,
        status: 'ACTIVE'
      },
      {
        seller_id: sellerId,
        category_id: catMap['Books'] || 1,
        name: 'BSCS Data Structures Book',
        description: 'Data Structures and Algorithms in Java, 6th Edition. Super helpful for second-year computer engineering/science subjects.',
        base_price: 180.00,
        status: 'ACTIVE'
      }
    ];

    const { data: existingProds } = await supabase.from('products').select('*');
    const currentProdNames = existingProds ? existingProds.map(p => p.name) : [];
    const missingProds = demoProducts.filter(p => !currentProdNames.includes(p.name));

    if (missingProds.length > 0) {
      const { error: prodInsertError } = await supabase
        .from('products')
        .insert(missingProds);
      if (prodInsertError) throw prodInsertError;
      console.log(`✅ Successfully seeded ${missingProds.length} active products to feed!`);
    } else {
      console.log('ℹ️ Products table already fully loaded.');
    }

    console.log('🎉 Supabase database seeding procedure completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed with critical error:', err);
  }
}

seed();
