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

-- 0. Aktifkan Ekstensi Kriptografi Standar PostgreSQL (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table Stores / Profil Toko & Preferensi Cetak
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY DEFAULT 'default-store',
  name TEXT NOT NULL,
  subtitle TEXT,
  address TEXT,
  phone TEXT,
  footer_msg TEXT,
  default_paper TEXT DEFAULT 'A4',
  custom_paper_name TEXT DEFAULT 'Kustom',
  custom_paper_width NUMERIC DEFAULT 100,
  custom_paper_height NUMERIC DEFAULT 150,
  custom_paper_margin NUMERIC DEFAULT 4,
  qr_size TEXT DEFAULT 'medium',
  custom_qr_size NUMERIC DEFAULT 24,
  custom_qr_unit TEXT DEFAULT 'mm',
  custom_qr_size_px INTEGER DEFAULT 80,
  qr_position TEXT DEFAULT 'right',
  show_qr_code BOOLEAN DEFAULT TRUE,
  density TEXT DEFAULT 'normal',
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrasi aman (bila tabel stores sudah dibuat sebelumnya):
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS default_paper TEXT DEFAULT 'A4';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_paper_name TEXT DEFAULT 'Kustom';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_paper_width NUMERIC DEFAULT 100;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_paper_height NUMERIC DEFAULT 150;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_paper_margin NUMERIC DEFAULT 4;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_size TEXT DEFAULT 'medium';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_qr_size NUMERIC DEFAULT 24;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_qr_unit TEXT DEFAULT 'mm';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_qr_size_px INTEGER DEFAULT 80;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_position TEXT DEFAULT 'right';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT TRUE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS density TEXT DEFAULT 'normal';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_holder TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

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

-- 5. Table User Accounts / Akun Pengguna & Hak Akses
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_username_len CHECK (char_length(username) >= 3),
  CONSTRAINT chk_role_valid CHECK (role IN ('superadmin', 'admin'))
);

-- Migrasi jika tabel user_accounts lama sudah terlanjur dibuat dengan kolom 'password'
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_accounts' AND column_name = 'password'
  ) THEN
    ALTER TABLE public.user_accounts RENAME COLUMN password TO password_hash;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.user_accounts 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE IF EXISTS public.user_accounts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.user_accounts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS public.user_accounts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Table Login Logs / Audit Jejak Autentikasi
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public stores access" ON public.stores;
DROP POLICY IF EXISTS "Public catalog access" ON public.catalog_presets;
DROP POLICY IF EXISTS "Public transactions access" ON public.transactions;
DROP POLICY IF EXISTS "Public transaction_items access" ON public.transaction_items;
DROP POLICY IF EXISTS "Public user_accounts select" ON public.user_accounts;
DROP POLICY IF EXISTS "Public user_accounts manage" ON public.user_accounts;
DROP POLICY IF EXISTS "Public login_logs access" ON public.login_logs;

CREATE POLICY "Public stores access" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public catalog access" ON public.catalog_presets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public transactions access" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public transaction_items access" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public user_accounts select" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Public user_accounts manage" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public login_logs access" ON public.login_logs FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================================
-- STORED FUNCTIONS / RPC (SINGLE AUTHENTICATION PATH & SERVER-SIDE BCRYPT)
-- ==========================================================================

-- A. RPC: Autentikasi Login Kasir (auth_login)
CREATE OR REPLACE FUNCTION public.auth_login(
  p_username TEXT,
  p_password TEXT,
  p_ip TEXT DEFAULT '',
  p_device TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_recent_failures INTEGER;
  v_clean_user TEXT;
BEGIN
  v_clean_user := lower(trim(p_username));

  -- 1. Rate Limiting: Cek kegagalan login dalam 10 menit terakhir
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_logs
  WHERE lower(username) = v_clean_user
    AND is_success = false
    AND created_at > (NOW() - INTERVAL '10 minutes');

  IF v_recent_failures >= 5 THEN
    INSERT INTO public.login_logs (username, ip_address, user_agent, is_success, failure_reason)
    VALUES (p_username, p_ip, p_device, false, 'Rate limit terlampaui (terlalu banyak percobaan gagal)');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Terlalu banyak percobaan gagal. Akun sementara dibatasi selama 10 menit demi keamanan.'
    );
  END IF;

  -- 2. Cari akun di database
  SELECT id, username, password_hash, name, role, is_active
  INTO v_user
  FROM public.user_accounts
  WHERE lower(username) = v_clean_user
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.login_logs (username, ip_address, user_agent, is_success, failure_reason)
    VALUES (p_username, p_ip, p_device, false, 'Username tidak ditemukan');

    RETURN jsonb_build_object('success', false, 'error', 'Username atau Password salah.');
  END IF;

  -- 3. Periksa status aktif akun
  IF v_user.is_active = false THEN
    INSERT INTO public.login_logs (username, user_id, ip_address, user_agent, is_success, failure_reason)
    VALUES (p_username, v_user.id, p_ip, p_device, false, 'Akun dinonaktifkan oleh administrator');

    RETURN jsonb_build_object('success', false, 'error', 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.');
  END IF;

  -- 4. Verifikasi password dengan bcrypt (pgcrypto)
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    -- Login Berhasil
    INSERT INTO public.login_logs (username, user_id, ip_address, user_agent, is_success)
    VALUES (v_user.username, v_user.id, p_ip, p_device, true);

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'name', v_user.name,
        'role', v_user.role,
        'is_active', v_user.is_active,
        'login_time', NOW()
      )
    );
  ELSE
    -- Password Salah
    INSERT INTO public.login_logs (username, user_id, ip_address, user_agent, is_success, failure_reason)
    VALUES (p_username, v_user.id, p_ip, p_device, false, 'Password salah');

    RETURN jsonb_build_object('success', false, 'error', 'Username atau Password salah.');
  END IF;
END;
$$;

-- B. RPC: Tambah Akun Baru dengan Server-Side Bcrypt (admin_create_account)
CREATE OR REPLACE FUNCTION public.admin_create_account(
  p_username TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id TEXT;
  v_hash TEXT;
  v_clean_user TEXT;
BEGIN
  v_clean_user := lower(trim(p_username));

  IF char_length(v_clean_user) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username minimal 3 karakter.');
  END IF;

  IF char_length(p_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password minimal 8 karakter.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_accounts WHERE lower(username) = v_clean_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username sudah digunakan oleh akun lain.');
  END IF;

  v_new_id := 'usr-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  v_hash := crypt(p_password, gen_salt('bf', 10));

  INSERT INTO public.user_accounts (id, username, password_hash, name, role, is_active, updated_at)
  VALUES (v_new_id, trim(p_username), v_hash, trim(p_name), p_role, true, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'account', jsonb_build_object(
      'id', v_new_id,
      'username', trim(p_username),
      'name', trim(p_name),
      'role', p_role,
      'is_active', true
    )
  );
END;
$$;

-- C. RPC: Update Akun (admin_update_account)
CREATE OR REPLACE FUNCTION public.admin_update_account(
  p_id TEXT,
  p_username TEXT,
  p_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_user TEXT;
  v_hash TEXT;
BEGIN
  v_clean_user := lower(trim(p_username));

  -- Cek duplikasi username untuk ID lain
  IF EXISTS (SELECT 1 FROM public.user_accounts WHERE lower(username) = v_clean_user AND id <> p_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username sudah digunakan oleh akun lain.');
  END IF;

  IF p_password IS NOT NULL AND char_length(trim(p_password)) > 0 THEN
    IF char_length(p_password) < 8 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Password baru minimal 8 karakter.');
    END IF;
    v_hash := crypt(p_password, gen_salt('bf', 10));

    UPDATE public.user_accounts
    SET username = trim(p_username),
        password_hash = v_hash,
        name = COALESCE(trim(p_name), name),
        role = COALESCE(p_role, role),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = p_id;
  ELSE
    UPDATE public.user_accounts
    SET username = trim(p_username),
        name = COALESCE(trim(p_name), name),
        role = COALESCE(p_role, role),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = p_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- D. RPC: Hapus Akun dengan Proteksi Superadmin (admin_delete_account)
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_acc RECORD;
  v_super_count INTEGER;
BEGIN
  SELECT id, username, role INTO v_acc FROM public.user_accounts WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Akun tidak ditemukan.');
  END IF;

  IF v_acc.role = 'superadmin' THEN
    SELECT COUNT(*) INTO v_super_count FROM public.user_accounts WHERE role = 'superadmin';
    IF v_super_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Tidak dapat menghapus satu-satunya akun Superadmin utama.');
    END IF;
  END IF;

  DELETE FROM public.user_accounts WHERE id = p_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
`;
