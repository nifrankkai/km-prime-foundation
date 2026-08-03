REVOKE EXECUTE ON FUNCTION public.reset_platform_data(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_platform_reset_password(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_platform_reset_enabled(boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_system_event(uuid, text, text, jsonb) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_platform_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_reset_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_platform_reset_enabled(boolean) TO authenticated;