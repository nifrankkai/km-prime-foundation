-- ===== Roles & permissions =====
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'mini_admin', 'stockist');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE public.transaction_type AS ENUM (
  'commission_credit', 'withdrawal_debit', 'withdrawal_refund',
  'admin_credit', 'admin_debit', 'order_payment', 'license_payment'
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);
GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    OR COALESCE(
      (SELECT o.granted FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.permission_key = _key),
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role = ur.role
        WHERE ur.user_id = _user_id AND rp.permission_key = _key AND rp.granted
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'staff.manage'));
CREATE POLICY "Staff read role permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Users read own overrides" ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'staff.manage'));

INSERT INTO public.role_permissions (role, permission_key, granted) VALUES
  ('super_admin','members.manage',true),('super_admin','members.wallet',true),
  ('super_admin','kyc.review',true),('super_admin','withdrawals.review',true),
  ('super_admin','products.manage',true),('super_admin','orders.manage',true),
  ('super_admin','stock.manage',true),('super_admin','commissions.manage',true),
  ('super_admin','ranks.manage',true),('super_admin','announcements.manage',true),
  ('super_admin','gallery.manage',true),('super_admin','reports.view',true),
  ('super_admin','staff.manage',true),('super_admin','settings.manage',true),
  ('manager','members.manage',true),('manager','members.wallet',true),
  ('manager','kyc.review',true),('manager','withdrawals.review',true),
  ('manager','products.manage',true),('manager','orders.manage',true),
  ('manager','stock.manage',true),('manager','commissions.manage',true),
  ('manager','ranks.manage',false),('manager','announcements.manage',true),
  ('manager','gallery.manage',true),('manager','reports.view',true),
  ('manager','staff.manage',true),('manager','settings.manage',false),
  ('mini_admin','members.manage',true),('mini_admin','members.wallet',false),
  ('mini_admin','kyc.review',true),('mini_admin','withdrawals.review',false),
  ('mini_admin','products.manage',false),('mini_admin','orders.manage',true),
  ('mini_admin','stock.manage',false),('mini_admin','commissions.manage',false),
  ('mini_admin','ranks.manage',false),('mini_admin','announcements.manage',false),
  ('mini_admin','gallery.manage',false),('mini_admin','reports.view',true),
  ('mini_admin','staff.manage',false),('mini_admin','settings.manage',false),
  ('stockist','members.manage',false),('stockist','members.wallet',false),
  ('stockist','kyc.review',false),('stockist','withdrawals.review',false),
  ('stockist','products.manage',false),('stockist','orders.manage',true),
  ('stockist','stock.manage',true),('stockist','commissions.manage',false),
  ('stockist','ranks.manage',false),('stockist','announcements.manage',false),
  ('stockist','gallery.manage',false),('stockist','reports.view',false),
  ('stockist','staff.manage',false),('stockist','settings.manage',false);

-- ===== Wallets, transactions, withdrawals =====
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  frozen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wallet visible to owner and staff" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'members.manage'));
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount_cents integer NOT NULL,
  balance_after_cents integer NOT NULL,
  reference text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions visible to owner and staff" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'reports.view'));
CREATE INDEX transactions_user_created_idx ON public.transactions (user_id, created_at DESC);

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  method public.payment_method NOT NULL,
  destination text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Withdrawals visible to owner and reviewers" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'withdrawals.review'));
CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Announcements & gallery =====
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published announcements are public" ON public.announcements FOR SELECT
  TO anon, authenticated USING (published);
CREATE POLICY "Announcement managers see all" ON public.announcements FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'announcements.manage'));
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gallery_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  rank_key text,
  caption text,
  photo_url text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_features TO authenticated;
GRANT SELECT ON public.gallery_features TO anon;
GRANT ALL ON public.gallery_features TO service_role;
ALTER TABLE public.gallery_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible gallery entries are public" ON public.gallery_features FOR SELECT
  TO anon, authenticated USING (visible);
CREATE POLICY "Gallery managers see all" ON public.gallery_features FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'gallery.manage'));
CREATE TRIGGER gallery_updated_at BEFORE UPDATE ON public.gallery_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Staff read access to member data =====
CREATE POLICY "Staff read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'members.manage'));
CREATE POLICY "Staff read all members" ON public.members FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'members.manage'));
CREATE POLICY "Reviewers read all kyc" ON public.kyc_submissions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'kyc.review'));
CREATE POLICY "Staff read all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.manage'));
CREATE POLICY "Staff read all order items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.manage'));
CREATE POLICY "Staff read all commissions" ON public.commissions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'commissions.manage'));
CREATE POLICY "Staff read all pv" ON public.pv_totals FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'reports.view'));

-- ===== Commission crediting =====
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS credited_at timestamptz;

CREATE OR REPLACE FUNCTION public.wallet_apply(
  _user_id uuid, _type public.transaction_type, _amount_cents integer,
  _reference text, _note text, _actor uuid
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _balance integer;
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance_cents = balance_cents + _amount_cents
  WHERE user_id = _user_id RETURNING balance_cents INTO _balance;

  IF _balance < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  INSERT INTO public.transactions (user_id, type, amount_cents, balance_after_cents, reference, note, created_by)
  VALUES (_user_id, _type, _amount_cents, _balance, _reference, _note, _actor);

  RETURN _balance;
END; $$;
REVOKE EXECUTE ON FUNCTION public.wallet_apply(uuid, public.transaction_type, integer, text, text, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.credit_paid_commissions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row RECORD; _count int := 0;
BEGIN
  FOR _row IN
    SELECT id, user_id, amount_cents, type, period_month FROM public.commissions
    WHERE status = 'paid' AND credited_at IS NULL AND amount_cents > 0
  LOOP
    PERFORM public.wallet_apply(_row.user_id, 'commission_credit', _row.amount_cents,
      _row.id::text, _row.type::text || ' ' || to_char(_row.period_month, 'Mon YYYY'), NULL);
    UPDATE public.commissions SET credited_at = now() WHERE id = _row.id;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('credited', _count);
END; $$;
REVOKE EXECUTE ON FUNCTION public.credit_paid_commissions() FROM public, anon, authenticated;

-- ===== Member-facing withdrawal request =====
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount_cents integer, _method public.payment_method, _destination text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _kyc public.kyc_status; _wallet RECORD; _pending integer; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is $10.00'; END IF;

  SELECT status INTO _kyc FROM public.kyc_submissions WHERE user_id = _uid;
  IF _kyc IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'KYC approval is required before requesting a withdrawal';
  END IF;

  SELECT * INTO _wallet FROM public.wallets WHERE user_id = _uid;
  IF _wallet IS NULL OR _wallet.frozen THEN RAISE EXCEPTION 'Your wallet is frozen or unavailable'; END IF;

  SELECT COALESCE(sum(amount_cents), 0) INTO _pending
  FROM public.withdrawal_requests WHERE user_id = _uid AND status = 'pending';

  IF _amount_cents > _wallet.balance_cents - _pending THEN
    RAISE EXCEPTION 'Amount exceeds your available balance';
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, amount_cents, method, destination)
  VALUES (_uid, _amount_cents, _method, _destination) RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(integer, public.payment_method, text) TO authenticated;

-- ===== Admin actions =====
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _req RECORD;
BEGIN
  IF NOT public.has_permission(_uid, 'withdrawals.review') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _req FROM public.withdrawal_requests WHERE id = _id FOR UPDATE;
  IF _req IS NULL OR _req.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  IF _approve THEN
    PERFORM public.wallet_apply(_req.user_id, 'withdrawal_debit', -_req.amount_cents, _id::text,
      'Withdrawal approved', _uid);
    UPDATE public.withdrawal_requests
      SET status = 'approved', admin_note = _note, reviewed_by = _uid, reviewed_at = now() WHERE id = _id;
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_req.user_id, 'withdrawal', 'Withdrawal approved',
      'Your withdrawal of $' || to_char(_req.amount_cents / 100.0, 'FM999999990.00') || ' has been approved.');
  ELSE
    UPDATE public.withdrawal_requests
      SET status = 'rejected', admin_note = _note, reviewed_by = _uid, reviewed_at = now() WHERE id = _id;
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_req.user_id, 'withdrawal', 'Withdrawal rejected', COALESCE(_note, 'Your withdrawal request was rejected.'));
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_user_id uuid, _approve boolean, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'kyc.review') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.kyc_submissions
  SET status = CASE WHEN _approve THEN 'approved'::public.kyc_status ELSE 'rejected'::public.kyc_status END,
      rejection_reason = CASE WHEN _approve THEN NULL ELSE _reason END,
      reviewed_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (_user_id, 'kyc',
    CASE WHEN _approve THEN 'KYC approved' ELSE 'KYC rejected' END,
    CASE WHEN _approve THEN 'Your identity documents were approved. Withdrawals are now unlocked.'
         ELSE COALESCE(_reason, 'Your documents were rejected. Please resubmit.') END);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount_cents integer, _note text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'members.wallet') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _amount_cents = 0 THEN RAISE EXCEPTION 'Amount must not be zero'; END IF;
  RETURN public.wallet_apply(_user_id,
    CASE WHEN _amount_cents > 0 THEN 'admin_credit'::public.transaction_type ELSE 'admin_debit'::public.transaction_type END,
    _amount_cents, NULL, _note, _uid);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_wallet_frozen(_user_id uuid, _frozen boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'members.wallet') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.wallets (user_id, frozen) VALUES (_user_id, _frozen)
  ON CONFLICT (user_id) DO UPDATE SET frozen = _frozen;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_wallet_frozen(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_member_status(_user_id uuid, _status public.member_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'members.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.members SET status = _status WHERE id = _user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_member_status(uuid, public.member_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_role(_user_id uuid, _role public.app_role, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'staff.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _role = 'super_admin' AND NOT public.has_role(_uid, 'super_admin') THEN
    RAISE EXCEPTION 'Only a super administrator can grant that role';
  END IF;
  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role, created_by) VALUES (_user_id, _role, _uid)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role_permission(_role public.app_role, _key text, _granted boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.role_permissions (role, permission_key, granted) VALUES (_role, _key, _granted)
  ON CONFLICT (role, permission_key) DO UPDATE SET granted = _granted, updated_at = now();
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_role_permission(public.app_role, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_permission(_user_id uuid, _key text, _granted boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'staff.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.user_permission_overrides (user_id, permission_key, granted)
  VALUES (_user_id, _key, _granted)
  ON CONFLICT (user_id, permission_key) DO UPDATE SET granted = _granted, updated_at = now();
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_permission(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_product(
  _id uuid, _slug text, _name text, _description text, _category text,
  _retail_price_cents integer, _price_cents integer, _pv integer,
  _images text[], _stock_quantity integer, _status public.product_status
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _out uuid;
BEGIN
  IF NOT public.has_permission(_uid, 'products.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.products (slug, name, description, category, retail_price_cents, price_cents, pv, images, stock_quantity, status)
    VALUES (_slug, _name, _description, _category, _retail_price_cents, _price_cents, _pv, _images, _stock_quantity, _status)
    RETURNING id INTO _out;
  ELSE
    UPDATE public.products SET slug = _slug, name = _name, description = _description, category = _category,
      retail_price_cents = _retail_price_cents, price_cents = _price_cents, pv = _pv, images = _images,
      stock_quantity = _stock_quantity, status = _status
    WHERE id = _id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_product(uuid, text, text, text, text, integer, integer, integer, text[], integer, public.product_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_stock(_product_id uuid, _stock_quantity integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'stock.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.products SET stock_quantity = GREATEST(0, _stock_quantity) WHERE id = _product_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_stock(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(_order_id uuid, _status public.order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _order RECORD;
BEGIN
  IF NOT public.has_permission(_uid, 'orders.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF _order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE public.orders
  SET status = _status,
      payment_state = CASE WHEN _status = 'cancelled' THEN payment_state
                           WHEN payment_state = 'pending_review' AND _status <> 'awaiting_approval' THEN 'paid'::public.payment_state
                           ELSE payment_state END,
      shipped_at = CASE WHEN _status = 'shipped' THEN COALESCE(shipped_at, now()) ELSE shipped_at END
  WHERE id = _order_id;

  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (_order.user_id, 'order', 'Order ' || _order.reference || ' updated',
    'Your order status is now ' || replace(_status::text, '_', ' ') || '.');
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(uuid, public.order_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_commission_status(
  _commission_id uuid, _status public.commission_status, _amount_cents integer, _note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'commissions.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.commissions
  SET status = _status,
      amount_cents = COALESCE(_amount_cents, amount_cents),
      note = COALESCE(_note, note)
  WHERE id = _commission_id AND credited_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_commission_status(uuid, public.commission_status, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_rank(
  _key text, _min_personal_pv integer, _min_group_pv integer,
  _min_active_directs integer, _unlocked_levels integer, _leadership_share numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'ranks.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.ranks SET min_personal_pv = _min_personal_pv, min_group_pv = _min_group_pv,
    min_active_directs = _min_active_directs, unlocked_levels = _unlocked_levels,
    leadership_share = _leadership_share
  WHERE key = _key;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_rank(text, integer, integer, integer, integer, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_announcement(_id uuid, _title text, _body text, _published boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _out uuid;
BEGIN
  IF NOT public.has_permission(_uid, 'announcements.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.announcements (title, body, published, published_at, author_id)
    VALUES (_title, _body, _published, CASE WHEN _published THEN now() END, _uid) RETURNING id INTO _out;
  ELSE
    UPDATE public.announcements SET title = _title, body = _body, published = _published,
      published_at = CASE WHEN _published THEN COALESCE(published_at, now()) ELSE NULL END
    WHERE id = _id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_announcement(uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_gallery_feature(
  _id uuid, _display_name text, _rank_key text, _caption text, _photo_url text, _visible boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _out uuid;
BEGIN
  IF NOT public.has_permission(_uid, 'gallery.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.gallery_features (display_name, rank_key, caption, photo_url, visible)
    VALUES (_display_name, _rank_key, _caption, _photo_url, _visible) RETURNING id INTO _out;
  ELSE
    UPDATE public.gallery_features SET display_name = _display_name, rank_key = _rank_key,
      caption = _caption, photo_url = _photo_url, visible = _visible
    WHERE id = _id RETURNING id INTO _out;
  END IF;
  RETURN _out;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_upsert_gallery_feature(uuid, text, text, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_report_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'reports.view') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'active_members', (SELECT count(*) FROM public.members WHERE status = 'active'),
    'total_members', (SELECT count(*) FROM public.members),
    'licensed_members', (SELECT count(*) FROM public.members WHERE license_status = 'active'),
    'total_pv', (SELECT COALESCE(sum(personal_pv), 0) FROM public.pv_totals),
    'commissions_paid_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM public.commissions WHERE status = 'paid'),
    'commissions_held_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM public.commissions WHERE status = 'held'),
    'revenue_cents', (SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_state = 'paid'),
    'orders_count', (SELECT count(*) FROM public.orders),
    'pending_kyc', (SELECT count(*) FROM public.kyc_submissions WHERE status = 'pending'),
    'pending_withdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'),
    'revenue_by_month', (
      SELECT COALESCE(jsonb_agg(row ORDER BY row->>'month'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'month', to_char(date_trunc('month', created_at), 'YYYY-MM'),
          'revenue_cents', sum(total_cents),
          'orders', count(*)
        ) AS row
        FROM public.orders WHERE payment_state = 'paid'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) DESC LIMIT 6
      ) m
    )
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_report_stats() TO authenticated;

-- ===== Weekly cycle automation =====
CREATE OR REPLACE FUNCTION public.process_weekly_cycle()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pv jsonb; _credited jsonb;
BEGIN
  _pv := public.process_pv_totals();
  _credited := public.credit_paid_commissions();
  RETURN jsonb_build_object('pv', _pv, 'wallet', _credited);
END; $$;
REVOKE EXECUTE ON FUNCTION public.process_weekly_cycle() FROM public, anon, authenticated;