CREATE TABLE public.platform_reset_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  password_hash text,
  password_set_at timestamptz,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_reset_settings TO authenticated;
GRANT ALL ON public.platform_reset_settings TO service_role;
ALTER TABLE public.platform_reset_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read reset settings"
  ON public.platform_reset_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER platform_reset_settings_updated_at
  BEFORE UPDATE ON public.platform_reset_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_reset_settings (id, enabled) VALUES (true, false);

CREATE TABLE public.system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_audit_log TO authenticated;
GRANT ALL ON public.system_audit_log TO service_role;
ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read the system audit log"
  ON public.system_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.log_system_event(_actor uuid, _action text, _detail text, _metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = _actor;
  INSERT INTO public.system_audit_log (actor_id, actor_email, action, detail, metadata)
  VALUES (_actor, _email, _action, _detail, COALESCE(_metadata, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.set_platform_reset_password(_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _uid uuid := auth.uid(); _existing text;
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _password IS NULL OR length(_password) < 5 THEN
    RAISE EXCEPTION 'The reset password must be at least 5 characters';
  END IF;

  SELECT password_hash INTO _existing FROM public.platform_reset_settings WHERE id;

  UPDATE public.platform_reset_settings
  SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf')),
      password_set_at = now(), enabled = true, updated_by = _uid
  WHERE id;

  PERFORM public.log_system_event(_uid,
    CASE WHEN _existing IS NULL THEN 'kill_switch.password_set' ELSE 'kill_switch.password_changed' END,
    CASE WHEN _existing IS NULL
         THEN 'Reset password set; kill switch enabled.'
         ELSE 'Reset password changed; kill switch enabled.' END,
    '{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.set_platform_reset_enabled(_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _hash text;
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT password_hash INTO _hash FROM public.platform_reset_settings WHERE id;
  IF _enabled AND _hash IS NULL THEN
    RAISE EXCEPTION 'Set a reset password before enabling the kill switch';
  END IF;

  UPDATE public.platform_reset_settings SET enabled = _enabled, updated_by = _uid WHERE id;

  PERFORM public.log_system_event(_uid,
    CASE WHEN _enabled THEN 'kill_switch.enabled' ELSE 'kill_switch.disabled' END,
    CASE WHEN _enabled THEN 'Kill switch enabled.' ELSE 'Kill switch disabled; stored password hash kept.' END,
    '{}'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.reset_platform_data(_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cfg RECORD;
  _floor text;
  _removed int;
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT * INTO _cfg FROM public.platform_reset_settings WHERE id;
  IF _cfg IS NULL OR NOT _cfg.enabled OR _cfg.password_hash IS NULL THEN
    RAISE EXCEPTION 'The platform kill switch is not enabled';
  END IF;
  IF _cfg.password_hash <> extensions.crypt(_password, _cfg.password_hash) THEN
    RAISE EXCEPTION 'INVALID_RESET_PASSWORD';
  END IF;

  SELECT count(*) INTO _removed FROM public.profiles WHERE id <> _uid;

  -- child / dependent records first
  DELETE FROM public.support_ticket_messages;
  DELETE FROM public.support_tickets;
  DELETE FROM public.pv_transactions;
  DELETE FROM public.pv_period_history;
  DELETE FROM public.pv_totals;
  DELETE FROM public.rank_history;
  DELETE FROM public.commissions;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.cart_items;
  DELETE FROM public.deposit_requests;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.transactions;
  DELETE FROM public.wallets;
  DELETE FROM public.kyc_submissions;
  DELETE FROM public.license_payments;
  DELETE FROM public.license_reminders;
  DELETE FROM public.notifications;
  DELETE FROM public.matrix_positions;

  -- break references held by preserved configuration rows
  UPDATE public.gallery_features SET member_id = NULL WHERE member_id IS NOT NULL AND member_id <> _uid;
  UPDATE public.announcements SET author_id = NULL WHERE author_id IS NOT NULL AND author_id <> _uid;
  UPDATE public.site_content SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by <> _uid;
  UPDATE public.site_branding SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by <> _uid;
  UPDATE public.email_settings SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by <> _uid;
  UPDATE public.platform_reset_settings SET updated_by = _uid WHERE updated_by IS NOT NULL AND updated_by <> _uid;
  UPDATE public.user_roles SET created_by = NULL WHERE created_by IS NOT NULL AND created_by <> _uid;

  -- member accounts, keeping only the acting super admin
  DELETE FROM public.user_permission_overrides WHERE user_id <> _uid;
  DELETE FROM public.user_roles WHERE user_id <> _uid;
  UPDATE public.profiles SET referrer_id = NULL WHERE referrer_id IS NOT NULL AND referrer_id <> _uid;
  DELETE FROM public.members WHERE id <> _uid;
  DELETE FROM public.profiles WHERE id <> _uid;

  -- clean baseline for the acting super admin
  SELECT key INTO _floor FROM public.ranks ORDER BY level ASC LIMIT 1;
  UPDATE public.members
  SET status = 'pending', license_status = 'inactive', license_expiry_date = NULL,
      grace_started_at = NULL, activated_at = NULL, rank_key = COALESCE(_floor, rank_key),
      withdrawal_pin_hash = NULL, pin_set_at = NULL
  WHERE id = _uid;
  UPDATE public.profiles SET referrer_id = NULL WHERE id = _uid;
  INSERT INTO public.wallets (user_id, balance_cents, frozen) VALUES (_uid, 0, false)
  ON CONFLICT (user_id) DO UPDATE SET balance_cents = 0, frozen = false;

  PERFORM public.log_system_event(_uid, 'platform.reset',
    'Platform data reset. All member accounts and records deleted; products, payment methods, branding and definitions preserved.',
    jsonb_build_object('accounts_removed', _removed));

  RETURN jsonb_build_object('accounts_removed', _removed);
END; $$;