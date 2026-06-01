REVOKE EXECUTE ON FUNCTION public.log_valuation_changes() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_locked_valuation_update() FROM public, anon, authenticated;