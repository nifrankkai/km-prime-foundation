-- Payment method admin
CREATE OR REPLACE FUNCTION public.admin_set_payment_method(_key text, _is_enabled boolean, _instructions text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payment_methods
  SET is_enabled = _is_enabled, instructions_text = COALESCE(_instructions, instructions_text)
  WHERE key = _key;
END; $$;

-- Member submits a deposit
CREATE OR REPLACE FUNCTION public.submit_deposit(_method_key text, _amount_cents integer, _screenshot_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _enabled boolean; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 100 THEN RAISE EXCEPTION 'Minimum deposit is $1.00'; END IF;
  SELECT is_enabled INTO _enabled FROM public.payment_methods WHERE key = _method_key;
  IF _enabled IS NOT TRUE THEN RAISE EXCEPTION 'That payment method is not available'; END IF;

  INSERT INTO public.deposit_requests (user_id, method_key, amount_cents, screenshot_path)
  VALUES (_uid, _method_key, _amount_cents, _screenshot_path) RETURNING id INTO _id;

  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (NULL, 'admin', 'deposit', 'New deposit awaiting review',
    'A member submitted a deposit of $' || to_char(_amount_cents / 100.0, 'FM999999990.00') || '.');
  RETURN _id;
END; $$;

-- Admin approves / rejects a deposit (atomic)
CREATE OR REPLACE FUNCTION public.admin_review_deposit(_id uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _req RECORD;
BEGIN
  IF NOT public.has_permission(_uid, 'deposits.review') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _req FROM public.deposit_requests WHERE id = _id FOR UPDATE;
  IF _req IS NULL OR _req.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  IF _approve THEN
    PERFORM public.wallet_apply(_req.user_id, 'deposit_credit', _req.amount_cents, _id::text,
      COALESCE(_note, 'Deposit approved (' || _req.method_key || ')'), _uid);
    UPDATE public.deposit_requests
      SET status = 'approved', admin_note = _note, reviewed_by = _uid, reviewed_at = now() WHERE id = _id;
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    VALUES (_req.user_id, 'member', 'deposit', 'Deposit approved',
      'Your deposit of $' || to_char(_req.amount_cents / 100.0, 'FM999999990.00') || ' has been credited to your wallet.');
  ELSE
    UPDATE public.deposit_requests
      SET status = 'rejected', admin_note = _note, reviewed_by = _uid, reviewed_at = now() WHERE id = _id;
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    VALUES (_req.user_id, 'member', 'deposit', 'Deposit rejected',
      COALESCE(_note, 'Your deposit request was rejected.'));
  END IF;
END; $$;

-- Balance-enforced activation
CREATE OR REPLACE FUNCTION public.activate_member(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cost integer := 7500; _balance integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.license_payments WHERE user_id = _user_id AND kind = 'membership_package') THEN
    RAISE EXCEPTION 'Membership is already activated';
  END IF;

  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_cents INTO _balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF COALESCE(_balance, 0) < _cost THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  PERFORM public.wallet_apply(_user_id, 'license_payment', -_cost, NULL,
    'Membership package + first business licence', _user_id);

  INSERT INTO public.license_payments (user_id, kind, amount_cents) VALUES (_user_id, 'membership_package', 6500);
  INSERT INTO public.license_payments (user_id, kind, amount_cents, period_start, period_end)
  VALUES (_user_id, 'license_activation', 1000, CURRENT_DATE, CURRENT_DATE + 30);

  UPDATE public.members
  SET status = 'active', license_status = 'active',
      license_expiry_date = CURRENT_DATE + 30, grace_started_at = NULL,
      activated_at = COALESCE(activated_at, now())
  WHERE id = _user_id;

  PERFORM public.place_in_matrix(_user_id);
END; $$;

-- Balance-enforced licence renewal
CREATE OR REPLACE FUNCTION public.pay_license(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _cost integer := 1000; _balance integer; _was_inactive boolean;
BEGIN
  SELECT license_status = 'inactive' INTO _was_inactive FROM public.members WHERE id = _user_id;

  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_cents INTO _balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF COALESCE(_balance, 0) < _cost THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  PERFORM public.wallet_apply(_user_id, 'license_payment', -_cost, NULL, 'Monthly business licence', _user_id);

  INSERT INTO public.license_payments (user_id, kind, amount_cents, period_start, period_end)
  VALUES (_user_id, 'license_renewal', 1000, CURRENT_DATE, CURRENT_DATE + 30);

  UPDATE public.members
  SET license_status = 'active', status = 'active', grace_started_at = NULL,
      license_expiry_date = GREATEST(COALESCE(license_expiry_date, CURRENT_DATE), CURRENT_DATE) + 30
  WHERE id = _user_id;

  IF _was_inactive THEN PERFORM public.place_in_matrix(_user_id); END IF;
END; $$;

-- Wallet-funded order payment (atomic)
CREATE OR REPLACE FUNCTION public.pay_order_from_wallet(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _order RECORD; _balance integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id AND user_id = _uid FOR UPDATE;
  IF _order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.payment_state = 'paid' THEN RETURN; END IF;

  INSERT INTO public.wallets (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_cents INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_balance, 0) < _order.total_cents THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  PERFORM public.wallet_apply(_uid, 'order_payment', -_order.total_cents, _order.reference,
    'Order ' || _order.reference, _uid);

  UPDATE public.orders SET payment_state = 'paid', status = 'paid' WHERE id = _order_id;
END; $$;

-- Wallet balance check helper for the UI
CREATE OR REPLACE FUNCTION public.my_wallet_balance()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT balance_cents FROM public.wallets WHERE user_id = auth.uid()), 0);
$$;
