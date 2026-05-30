ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS legal_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS title_deed_no text,
  ADD COLUMN IF NOT EXISTS registration_office text,
  ADD COLUMN IF NOT EXISTS encumbrances jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS building_permit_no text,
  ADD COLUMN IF NOT EXISTS reconciliation_status text;

COMMENT ON COLUMN public.properties.legal_status IS
  'registered_ayni | registered_personal | primary_contract | court_judgment | possession | customary | unknown';