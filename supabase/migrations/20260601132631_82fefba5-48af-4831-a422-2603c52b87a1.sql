-- 1) Audit log table for valuations
CREATE TABLE public.valuation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id uuid NOT NULL,
  appraiser_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','SIGN')),
  changed_fields jsonb DEFAULT '{}'::jsonb,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.valuation_audit_log TO authenticated;
GRANT ALL ON public.valuation_audit_log TO service_role;

ALTER TABLE public.valuation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appraiser views own audit log"
ON public.valuation_audit_log FOR SELECT TO authenticated
USING (auth.uid() = appraiser_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "system inserts audit log"
ON public.valuation_audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = appraiser_id);

CREATE INDEX idx_audit_valuation ON public.valuation_audit_log(valuation_id);
CREATE INDEX idx_audit_appraiser ON public.valuation_audit_log(appraiser_id);
CREATE INDEX idx_audit_created ON public.valuation_audit_log(created_at DESC);

-- 2) Digital signature fields on valuations
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by uuid,
  ADD COLUMN IF NOT EXISTS signature_hash text,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- 3) Trigger to auto-log changes on valuations
CREATE OR REPLACE FUNCTION public.log_valuation_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appraiser uuid;
  v_action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_appraiser := OLD.appraiser_id;
    v_action := 'DELETE';
    INSERT INTO public.valuation_audit_log(valuation_id, appraiser_id, action, old_values)
    VALUES (OLD.id, v_appraiser, v_action, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_appraiser := NEW.appraiser_id;
    v_action := CASE WHEN NEW.signed_at IS NOT NULL AND OLD.signed_at IS NULL THEN 'SIGN' ELSE 'UPDATE' END;
    INSERT INTO public.valuation_audit_log(valuation_id, appraiser_id, action, old_values, new_values)
    VALUES (NEW.id, v_appraiser, v_action, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.valuation_audit_log(valuation_id, appraiser_id, action, new_values)
    VALUES (NEW.id, NEW.appraiser_id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_valuation_changes ON public.valuations;
CREATE TRIGGER trg_log_valuation_changes
AFTER INSERT OR UPDATE OR DELETE ON public.valuations
FOR EACH ROW EXECUTE FUNCTION public.log_valuation_changes();

-- 4) Prevent updating signed/locked valuations (except by admin)
CREATE OR REPLACE FUNCTION public.prevent_locked_valuation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.locked = true AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'لا يمكن تعديل تقييم موقع/مقفل';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_valuation ON public.valuations;
CREATE TRIGGER trg_prevent_locked_valuation
BEFORE UPDATE ON public.valuations
FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_valuation_update();