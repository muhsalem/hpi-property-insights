
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'appraiser');
CREATE TYPE public.property_category AS ENUM ('res', 'com', 'ind');
CREATE TYPE public.building_type AS ENUM ('APT', 'TWR', 'VIL', 'DPX', 'COM', 'LND', 'IND');
CREATE TYPE public.valuation_status AS ENUM ('draft', 'finalized', 'submitted');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  license_no TEXT,
  license_authority TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 4. Auto-create profile + assign appraiser role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'appraiser');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. DISTRICTS
CREATE TABLE public.districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  city_id TEXT NOT NULL DEFAULT 'ps',
  city_name TEXT NOT NULL DEFAULT 'بورسعيد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.districts TO authenticated, anon;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads districts" ON public.districts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins write districts" ON public.districts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. AREAS (المناطق)
CREATE TABLE public.areas (
  id TEXT PRIMARY KEY,
  district_id TEXT NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  base_price NUMERIC(14,2) NOT NULL,
  growth NUMERIC(5,4) NOT NULL DEFAULT 0,
  land_psqm NUMERIC(12,2) NOT NULL DEFAULT 0,
  land_own TEXT,
  -- HOOD scores (1-5)
  infra_rating INT,
  safety_rating INT,
  services_rating INT,
  transport_rating INT,
  hood_desc TEXT,
  nearby JSONB DEFAULT '[]'::jsonb,
  issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.areas TO authenticated, anon;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads areas" ON public.areas FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins write areas" ON public.areas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_areas_district ON public.areas(district_id);

-- 7. PROPERTIES (الوحدات العقارية)
CREATE TABLE public.properties (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  category public.property_category NOT NULL,
  subcategory TEXT,
  type_label TEXT NOT NULL,
  area_sqm NUMERIC(10,2) NOT NULL,
  floor INT,
  view TEXT,
  finish TEXT,
  rooms INT DEFAULT 0,
  baths INT DEFAULT 0,
  base_price NUMERIC(14,2) NOT NULL,
  year_built INT,
  purchase_price NUMERIC(14,2),
  purchase_date DATE,
  building_type public.building_type NOT NULL,
  profile JSONB DEFAULT '{}'::jsonb,
  renovations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO authenticated, anon;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads properties" ON public.properties FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins write properties" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_props_area ON public.properties(area_id);
CREATE INDEX idx_props_cat ON public.properties(category);

-- 8. TRANSACTIONS (سجل البيع المتكرر — أساس HPI)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  price NUMERIC(14,2) NOT NULL,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated, anon;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads transactions" ON public.transactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins write transactions" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_txn_prop ON public.transactions(property_id, txn_date);

-- 9. VALUATIONS (تقارير المقيّم)
CREATE TABLE public.valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appraiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT REFERENCES public.properties(id) ON DELETE SET NULL,
  -- snapshot of inputs at valuation time
  subject_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 5 methods results
  sales_value NUMERIC(14,2),
  income_value NUMERIC(14,2),
  cost_value NUMERIC(14,2),
  residual_value NUMERIC(14,2),
  profit_value NUMERIC(14,2),
  -- adjustment grid (comparables + adjustments)
  adjustment_grid JSONB DEFAULT '[]'::jsonb,
  -- weights jsonb {sales:50,income:25,cost:25,...}
  weights JSONB DEFAULT '{}'::jsonb,
  final_value NUMERIC(14,2),
  confidence_interval NUMERIC(5,2),
  standard TEXT NOT NULL DEFAULT 'egy',
  status public.valuation_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuations TO authenticated;
GRANT ALL ON public.valuations TO service_role;
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appraiser views own valuations" ON public.valuations FOR SELECT TO authenticated USING (auth.uid() = appraiser_id);
CREATE POLICY "appraiser creates own valuations" ON public.valuations FOR INSERT TO authenticated WITH CHECK (auth.uid() = appraiser_id);
CREATE POLICY "appraiser updates own valuations" ON public.valuations FOR UPDATE TO authenticated USING (auth.uid() = appraiser_id);
CREATE POLICY "appraiser deletes own valuations" ON public.valuations FOR DELETE TO authenticated USING (auth.uid() = appraiser_id);
CREATE TRIGGER valuations_updated BEFORE UPDATE ON public.valuations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_val_app ON public.valuations(appraiser_id, created_at DESC);
