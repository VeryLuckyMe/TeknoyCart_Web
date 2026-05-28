-- =============================================================
-- TeknoyCart: Disable Row Level Security (RLS) on Presentation Tables
-- Run this directly in the Supabase SQL Editor to enable P2P Chat & Negotiations
-- Team 45 | Cebu Institute of Technology - University
-- =============================================================

-- Disable RLS on messaging and inquiries tables
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries DISABLE ROW LEVEL SECURITY;

-- Enable Supabase Realtime replication on Chats and Messages tables
-- (Crucial for multi-tab/account instant syncing without page refresh!)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Disable RLS on transactional tables to ensure checkout deals propagate
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs DISABLE ROW LEVEL SECURITY;

-- Confirm execution
SELECT 'RLS successfully disabled on Chats, Messages, Inquiries, Orders, and Payment Proofs tables! ✅' AS status;
