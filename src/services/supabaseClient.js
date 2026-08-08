/* ==========================================================================
   Supabase Client Service - Cloud Database Connection Engine
   ========================================================================== */

import { createClient } from '@supabase/supabase-js';

const CONFIG_KEYS = {
  URL: 'nota_supabase_url',
  KEY: 'nota_supabase_key'
};

export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(CONFIG_KEYS.URL) || '';
  const storedKey = localStorage.getItem(CONFIG_KEYS.KEY) || '';

  return {
    url: storedUrl || envUrl,
    key: storedKey || envKey,
    isEnv: !storedUrl && !!envUrl
  };
};

export const saveSupabaseConfig = (url, key) => {
  if (url) {
    localStorage.setItem(CONFIG_KEYS.URL, url.trim());
  } else {
    localStorage.removeItem(CONFIG_KEYS.URL);
  }

  if (key) {
    localStorage.setItem(CONFIG_KEYS.KEY, key.trim());
  } else {
    localStorage.removeItem(CONFIG_KEYS.KEY);
  }

  // Re-initialize client
  clientInstance = createSupabaseClient();
};

const createSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      return createClient(url, key, {
        auth: { persistSession: true },
        realtime: { timeout: 10000 }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return null;
};

let clientInstance = createSupabaseClient();

export const getSupabase = () => {
  if (!clientInstance) {
    clientInstance = createSupabaseClient();
  }
  return clientInstance;
};

export const isSupabaseConnected = () => {
  return !!getSupabase();
};

export const SQL_SCHEMA_QUERY = `-- ==========================================================================
-- E-NOTA PERCETAKAN DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Salin dan jalankan script ini di menu "SQL Editor" pada Dashboard Supabase Anda
-- ==========================================================================

-- 1. Table Stores / Profil Toko
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY DEFAULT 'default-store',
  name TEXT NOT NULL,
  subtitle TEXT,
  address TEXT,
  phone TEXT,
  footer_msg TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table Catalog Presets / Katalog Produk
CREATE TABLE IF NOT EXISTS public.catalog_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  finishing TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table Transactions / Riwayat Nota
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  no_nota TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  cust_name TEXT,
  cust_phone TEXT,
  cust_address TEXT,
  order_status TEXT DEFAULT 'Proses Cetak',
  pay_status TEXT DEFAULT 'Lunas',
  pay_method TEXT DEFAULT 'Transfer',
  bank_name TEXT,
  pickup_method TEXT DEFAULT 'Ditunggu',
  discount NUMERIC DEFAULT 0,
  dp NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  sisa NUMERIC DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table Transaction Items / Rincian Barang Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  length NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 0,
  qty INTEGER DEFAULT 1,
  price NUMERIC DEFAULT 0,
  finishing TEXT,
  book_title TEXT,
  book_size TEXT,
  book_pages INTEGER,
  book_paper_inner TEXT,
  book_cover TEXT,
  book_binding TEXT,
  custom_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) with public access policy (for single/multi-store access)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public stores access" ON public.stores FOR ALL USING (true);
CREATE POLICY "Public catalog access" ON public.catalog_presets FOR ALL USING (true);
CREATE POLICY "Public transactions access" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Public transaction_items access" ON public.transaction_items FOR ALL USING (true);
`;
