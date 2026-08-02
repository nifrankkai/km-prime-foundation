REVOKE EXECUTE ON FUNCTION public.place_in_matrix(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pay_license(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_license_grace() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_matrix_commissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_in_downline(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_in_downline(UUID, UUID) TO authenticated;