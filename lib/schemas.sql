-- ============================================================================
-- LAKSHMI ENTERPRISES ERP - COMPLETE SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- ============================================================================
-- Description: Production-ready SQL script for Supabase PostgreSQL.
-- Includes:
--   1. Custom Enum Types
--   2. Helper Functions & Security Definers
--   3. 11 Database Tables with Primary Keys, Foreign Keys, Defaults & Constraints
--   4. Automated `updated_at` Trigger Function & Triggers
--   5. High-Performance Indexes for Foreign Keys & Search Fields
--   6. Row Level Security (RLS) Enabled on All Tables
--   7. Role-Based RLS Policies (Admin, Associate, Staff)
--   8. Auth Profile Sync Trigger (`auth.users` -> `public.profiles`)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: CUSTOM ENUM TYPES
-- ============================================================================

-- Firm Type in the ERP (LE & SLSA)
DO $$ BEGIN
    CREATE TYPE public.firm_type AS ENUM ('LE', 'SLSA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Roles in the ERP
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'associate', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Account Status
DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Dealer Credit/Debit Transaction Types
DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order Associate Workflow Status
DO $$ BEGIN
    CREATE TYPE public.associate_status AS ENUM ('Draft', 'Submitted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order Approval Workflow Status
DO $$ BEGIN
    CREATE TYPE public.approving_status AS ENUM ('Pending', 'Partially Approved', 'Approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Order Packing/Warehouse Status
DO $$ BEGIN
    CREATE TYPE public.packing_status AS ENUM ('Pending', 'partially_packed', 'Packed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backorder Item Procurement Status
DO $$ BEGIN
    CREATE TYPE public.backorder_item_status AS ENUM ('Pending', 'Ordered', 'Partial', 'Completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backorder Dealer Fulfillment Status
DO $$ BEGIN
    CREATE TYPE public.backorder_dealer_status AS ENUM ('Pending', 'Fulfilled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backorder Type (Admin or Staff)
DO $$ BEGIN
    CREATE TYPE public.backorder_type AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ============================================================================
-- SECTION 2: REUSABLE TRIGGER FUNCTIONS & RLS HELPERS
-- ============================================================================

-- 2.1 Trigger function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Security Definer function to fetch user role safely without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2.3 Role check helper: Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role(auth.uid()) = 'admin', FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2.4 Role check helper: Associate
CREATE OR REPLACE FUNCTION public.is_associate()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role(auth.uid()) = 'associate', FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2.5 Role check helper: Staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role(auth.uid()) = 'staff', FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- SECTION 3: TABLE DEFINITIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Tied to Supabase Auth users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    role public.user_role NOT NULL DEFAULT 'staff',
    status public.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. COMPANIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. DEALERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    shop_name TEXT,
    address TEXT,
    le_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    slsa_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    le_credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    slsa_credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. DEALER_TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dealer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
    firm public.firm_type NOT NULL DEFAULT 'LE',
    transaction_type public.transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    credit_after_transaction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT UNIQUE NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    low_stock INTEGER NOT NULL DEFAULT 10,
    unit TEXT NOT NULL DEFAULT 'pcs',
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    firm public.firm_type NOT NULL DEFAULT 'LE',
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
    associate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    packed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    associate_status public.associate_status NOT NULL DEFAULT 'Draft',
    approving_status public.approving_status DEFAULT 'Pending',
    packing_status public.packing_status DEFAULT 'Pending',
    notes TEXT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ORDER_ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    requested_quantity INTEGER NOT NULL DEFAULT 0,
    approved_quantity INTEGER NOT NULL DEFAULT 0,
    released_quantity INTEGER NOT NULL DEFAULT 0,
    pending_quantity INTEGER NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. BACKORDER_ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backorder_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    required_quantity INTEGER NOT NULL DEFAULT 0,
    ordered_quantity INTEGER NOT NULL DEFAULT 0,
    pending_quantity INTEGER NOT NULL DEFAULT 0,
    status public.backorder_item_status NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. BACKORDER_DEALERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backorder_dealers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    pending_quantity INTEGER NOT NULL DEFAULT 0,
    fulfilled_quantity INTEGER NOT NULL DEFAULT 0,
    status public.backorder_dealer_status NOT NULL DEFAULT 'Pending',
    back_type public.backorder_type NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.backorder_dealers 
    ADD COLUMN IF NOT EXISTS back_type public.backorder_type NOT NULL DEFAULT 'staff';

-- ----------------------------------------------------------------------------
-- 11. SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT
);


-- ============================================================================
-- SECTION 4: ATTACH UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_companies_updated_at ON public.companies;
CREATE TRIGGER tr_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_categories_updated_at ON public.categories;
CREATE TRIGGER tr_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_dealers_updated_at ON public.dealers;
CREATE TRIGGER tr_dealers_updated_at BEFORE UPDATE ON public.dealers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_dealer_transactions_updated_at ON public.dealer_transactions;
CREATE TRIGGER tr_dealer_transactions_updated_at BEFORE UPDATE ON public.dealer_transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_order_items_updated_at ON public.order_items;
CREATE TRIGGER tr_order_items_updated_at BEFORE UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_backorder_items_updated_at ON public.backorder_items;
CREATE TRIGGER tr_backorder_items_updated_at BEFORE UPDATE ON public.backorder_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_backorder_dealers_updated_at ON public.backorder_dealers;
CREATE TRIGGER tr_backorder_dealers_updated_at BEFORE UPDATE ON public.backorder_dealers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SECTION 5: AUTOMATIC AUTH USER PROFILE PROVISIONING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'staff'::public.user_role),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- SECTION 6: PERFORMANCE INDEXES
-- ============================================================================

-- Foreign Keys & Frequently Searched Fields
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

CREATE INDEX IF NOT EXISTS idx_categories_code ON public.categories(category_code);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

CREATE INDEX IF NOT EXISTS idx_dealers_code ON public.dealers(dealer_code);
CREATE INDEX IF NOT EXISTS idx_dealers_name ON public.dealers(name);

CREATE INDEX IF NOT EXISTS idx_dealer_transactions_dealer_id ON public.dealer_transactions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_transactions_firm ON public.dealer_transactions(firm);
CREATE INDEX IF NOT EXISTS idx_dealer_transactions_dealer_firm ON public.dealer_transactions(dealer_id, firm);
CREATE INDEX IF NOT EXISTS idx_dealer_transactions_created_by ON public.dealer_transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_firm ON public.orders(firm);
CREATE INDEX IF NOT EXISTS idx_orders_dealer_id ON public.orders(dealer_id);
CREATE INDEX IF NOT EXISTS idx_orders_associate_id ON public.orders(associate_id);
CREATE INDEX IF NOT EXISTS idx_orders_packed_by ON public.orders(packed_by);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_backorder_items_product_id ON public.backorder_items(product_id);
CREATE INDEX IF NOT EXISTS idx_backorder_dealers_dealer_id ON public.backorder_dealers(dealer_id);
CREATE INDEX IF NOT EXISTS idx_backorder_dealers_order_id ON public.backorder_dealers(order_id);
CREATE INDEX IF NOT EXISTS idx_backorder_dealers_order_item_id ON public.backorder_dealers(order_item_id);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);


-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all 11 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backorder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backorder_dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7.1 PROFILES POLICIES
-- Admin: Full access to all profiles (View, Create, Edit, Activate/Deactivate, Delete, Role change)
-- Associate & Staff: View only their own profile
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7.2 COMPANIES POLICIES
-- Admin: Full CRUD
-- Associate & Staff: Read only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_admin_all" ON public.companies;
CREATE POLICY "companies_admin_all" ON public.companies
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "companies_read_authenticated" ON public.companies;
CREATE POLICY "companies_read_authenticated" ON public.companies
    FOR SELECT TO authenticated
    USING (public.is_associate() OR public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.3 CATEGORIES POLICIES
-- Admin: Full CRUD
-- Associate & Staff: Read only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_read_authenticated" ON public.categories;
CREATE POLICY "categories_read_authenticated" ON public.categories
    FOR SELECT TO authenticated
    USING (public.is_associate() OR public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.4 DEALERS POLICIES
-- Admin: Full CRUD
-- Associate: View, Create, Edit (Cannot delete)
-- Staff: View only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dealers_admin_all" ON public.dealers;
CREATE POLICY "dealers_admin_all" ON public.dealers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "dealers_associate_select" ON public.dealers;
CREATE POLICY "dealers_associate_select" ON public.dealers
    FOR SELECT TO authenticated
    USING (public.is_associate());

DROP POLICY IF EXISTS "dealers_associate_insert" ON public.dealers;
CREATE POLICY "dealers_associate_insert" ON public.dealers
    FOR INSERT TO authenticated
    WITH CHECK (public.is_associate());

DROP POLICY IF EXISTS "dealers_associate_update" ON public.dealers;
CREATE POLICY "dealers_associate_update" ON public.dealers
    FOR UPDATE TO authenticated
    USING (public.is_associate())
    WITH CHECK (public.is_associate());

DROP POLICY IF EXISTS "dealers_staff_select" ON public.dealers;
CREATE POLICY "dealers_staff_select" ON public.dealers
    FOR SELECT TO authenticated
    USING (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.5 DEALER_TRANSACTIONS POLICIES
-- Admin: Full CRUD
-- Associate: View all, Create (Cannot edit/delete)
-- Staff: View only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dealer_transactions_admin_all" ON public.dealer_transactions;
CREATE POLICY "dealer_transactions_admin_all" ON public.dealer_transactions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "dealer_transactions_associate_select" ON public.dealer_transactions;
CREATE POLICY "dealer_transactions_associate_select" ON public.dealer_transactions
    FOR SELECT TO authenticated
    USING (public.is_associate());

DROP POLICY IF EXISTS "dealer_transactions_associate_insert" ON public.dealer_transactions;
CREATE POLICY "dealer_transactions_associate_insert" ON public.dealer_transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_associate() AND created_by = auth.uid());

DROP POLICY IF EXISTS "dealer_transactions_staff_select" ON public.dealer_transactions;
CREATE POLICY "dealer_transactions_staff_select" ON public.dealer_transactions
    FOR SELECT TO authenticated
    USING (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.6 PRODUCTS POLICIES
-- Admin: Full CRUD
-- Associate: View all, Create, Edit (Cannot delete)
-- Staff: View only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_associate_select" ON public.products;
CREATE POLICY "products_associate_select" ON public.products
    FOR SELECT TO authenticated
    USING (public.is_associate());

DROP POLICY IF EXISTS "products_associate_insert" ON public.products;
CREATE POLICY "products_associate_insert" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.is_associate());

DROP POLICY IF EXISTS "products_associate_update" ON public.products;
CREATE POLICY "products_associate_update" ON public.products
    FOR UPDATE TO authenticated
    USING (public.is_associate())
    WITH CHECK (public.is_associate());

DROP POLICY IF EXISTS "products_staff_select" ON public.products;
CREATE POLICY "products_staff_select" ON public.products
    FOR SELECT TO authenticated
    USING (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.7 ORDERS POLICIES
-- Admin: Full CRUD (Create, Edit any order, Delete draft, Approve, Change status, Mark completed)
-- Associate:
--   - SELECT: Only orders assigned to themselves (associate_id = auth.uid())
--   - INSERT: Create new orders assigned to self
--   - UPDATE: Edit own orders until approved (approving_status IS NULL OR Pending). Cannot approve/modify approved/released quantities.
--   - DELETE: Delete own Draft orders before approval.
-- Staff:
--   - SELECT: View all orders
--   - UPDATE: Can update warehouse dispatch details (packed_by, packing_status). Cannot edit business/dealer details or approve.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_associate_select" ON public.orders;
CREATE POLICY "orders_associate_select" ON public.orders
    FOR SELECT TO authenticated
    USING (public.is_associate() AND associate_id = auth.uid());

DROP POLICY IF EXISTS "orders_associate_insert" ON public.orders;
CREATE POLICY "orders_associate_insert" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (public.is_associate() AND associate_id = auth.uid());

DROP POLICY IF EXISTS "orders_associate_update" ON public.orders;
CREATE POLICY "orders_associate_update" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        public.is_associate() AND 
        associate_id = auth.uid() AND 
        (approving_status IS NULL OR approving_status = 'Pending')
    )
    WITH CHECK (
        public.is_associate() AND 
        associate_id = auth.uid() AND 
        (approving_status IS NULL OR approving_status = 'Pending')
    );

DROP POLICY IF EXISTS "orders_associate_delete" ON public.orders;
CREATE POLICY "orders_associate_delete" ON public.orders
    FOR DELETE TO authenticated
    USING (
        public.is_associate() AND 
        associate_id = auth.uid() AND 
        associate_status = 'Draft' AND 
        (approving_status IS NULL OR approving_status = 'Pending')
    );

DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
CREATE POLICY "orders_staff_select" ON public.orders
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
CREATE POLICY "orders_staff_update" ON public.orders
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.8 ORDER_ITEMS POLICIES
-- Admin: Full CRUD
-- Associate: Full access (select, insert, update, delete) on own orders before approval
-- Staff: SELECT all order items, UPDATE released_quantity and pending_quantity
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "order_items_associate_unapproved_all" ON public.order_items;
CREATE POLICY "order_items_associate_unapproved_all" ON public.order_items
    FOR ALL TO authenticated
    USING (
        public.is_associate() AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.associate_id = auth.uid()
            AND (o.approving_status IS NULL OR o.approving_status = 'Pending')
        )
    )
    WITH CHECK (
        public.is_associate() AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.associate_id = auth.uid()
            AND (o.approving_status IS NULL OR o.approving_status = 'Pending')
        )
    );

DROP POLICY IF EXISTS "order_items_associate_approved_select" ON public.order_items;
CREATE POLICY "order_items_associate_approved_select" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        public.is_associate() AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id
            AND o.associate_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "order_items_staff_select" ON public.order_items;
CREATE POLICY "order_items_staff_select" ON public.order_items
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "order_items_staff_update" ON public.order_items;
CREATE POLICY "order_items_staff_update" ON public.order_items
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.9 BACKORDER_ITEMS POLICIES
-- Admin: Full CRUD
-- Staff: Insert, Update, Select
-- Associate: Read only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "backorder_items_admin_all" ON public.backorder_items;
CREATE POLICY "backorder_items_admin_all" ON public.backorder_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "backorder_items_read_authenticated" ON public.backorder_items;
CREATE POLICY "backorder_items_read_authenticated" ON public.backorder_items
    FOR SELECT TO authenticated
    USING (public.is_associate() OR public.is_staff());

DROP POLICY IF EXISTS "backorder_items_staff_insert" ON public.backorder_items;
CREATE POLICY "backorder_items_staff_insert" ON public.backorder_items
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "backorder_items_staff_update" ON public.backorder_items;
CREATE POLICY "backorder_items_staff_update" ON public.backorder_items
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.10 BACKORDER_DEALERS POLICIES
-- Admin: Full CRUD
-- Associate: Read only
-- Staff: Insert, Update, Select
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "backorder_dealers_admin_all" ON public.backorder_dealers;
CREATE POLICY "backorder_dealers_admin_all" ON public.backorder_dealers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "backorder_dealers_read_authenticated" ON public.backorder_dealers;
CREATE POLICY "backorder_dealers_read_authenticated" ON public.backorder_dealers
    FOR SELECT TO authenticated
    USING (public.is_associate() OR public.is_staff());

DROP POLICY IF EXISTS "backorder_dealers_staff_insert" ON public.backorder_dealers;
CREATE POLICY "backorder_dealers_staff_insert" ON public.backorder_dealers
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "backorder_dealers_staff_update" ON public.backorder_dealers;
CREATE POLICY "backorder_dealers_staff_update" ON public.backorder_dealers
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 7.11 SETTINGS POLICIES
-- Admin: Full CRUD
-- Associate: Read only
-- Staff: No access (Blocked)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "settings_admin_all" ON public.settings;
CREATE POLICY "settings_admin_all" ON public.settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_associate_select" ON public.settings;
CREATE POLICY "settings_associate_select" ON public.settings
    FOR SELECT TO authenticated
    USING (public.is_associate());


-- ============================================================================
-- SECTION 8: GRANT SCHEMA PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF SCHEMA SCRIPT
-- ============================================================================
