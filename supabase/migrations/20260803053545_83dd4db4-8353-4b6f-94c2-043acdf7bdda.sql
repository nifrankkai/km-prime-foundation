-- 1. PV transactions audit log
CREATE TABLE public.pv_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  pv_amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('personal','group')),
  level integer NOT NULL DEFAULT 0,
  period_month date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pv_transactions TO authenticated;
GRANT ALL ON public.pv_transactions TO service_role;
ALTER TABLE public.pv_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own pv transactions" ON public.pv_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff read all pv transactions" ON public.pv_transactions
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'reports.view'));

CREATE INDEX pv_transactions_user_period_idx ON public.pv_transactions (user_id, period_month);
CREATE INDEX pv_transactions_source_idx ON public.pv_transactions (source_user_id, period_month);

-- 2. PV period history
CREATE TABLE public.pv_period_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  personal_pv integer NOT NULL DEFAULT 0,
  group_pv integer NOT NULL DEFAULT 0,
  rank_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);
GRANT SELECT ON public.pv_period_history TO authenticated;
GRANT ALL ON public.pv_period_history TO service_role;
ALTER TABLE public.pv_period_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own pv history" ON public.pv_period_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff read all pv history" ON public.pv_period_history
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'reports.view'));

-- 3. Rank history snapshot + direction
ALTER TABLE public.rank_history
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'promotion',
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS period_month date;

-- 4. Apply PV for a paid order (buyer personal PV + upline group PV, logged)
CREATE OR REPLACE FUNCTION public.apply_order_pv(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order RECORD;
  _period date;
  _total_pv integer;
  _item RECORD;
  _pos uuid;
  _lvl int := 0;
  _parent uuid;
  _ancestor uuid;
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF _order IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.pv_transactions WHERE order_id = _order_id) THEN RETURN; END IF;

  _period := date_trunc('month', COALESCE(_order.created_at, now()))::date;

  SELECT COALESCE(sum(pv * quantity), 0)::int INTO _total_pv
  FROM public.order_items WHERE order_id = _order_id;
  IF _total_pv <= 0 THEN RETURN; END IF;

  -- personal PV, one row per product line for auditability
  FOR _item IN
    SELECT product_id, (pv * quantity)::int AS line_pv
    FROM public.order_items WHERE order_id = _order_id AND pv > 0
  LOOP
    INSERT INTO public.pv_transactions
      (user_id, source_user_id, order_id, product_id, pv_amount, type, level, period_month)
    VALUES (_order.user_id, _order.user_id, _order_id, _item.product_id, _item.line_pv, 'personal', 0, _period);
  END LOOP;

  INSERT INTO public.pv_totals (user_id, period_month, personal_pv, group_pv)
  VALUES (_order.user_id, _period, _total_pv, 0)
  ON CONFLICT (user_id, period_month) DO UPDATE
    SET personal_pv = public.pv_totals.personal_pv + EXCLUDED.personal_pv, updated_at = now();

  -- group PV up the matrix, capped at 15 levels
  SELECT parent_position_id INTO _parent FROM public.matrix_positions WHERE user_id = _order.user_id;
  WHILE _parent IS NOT NULL AND _lvl < 15 LOOP
    _lvl := _lvl + 1;
    SELECT user_id, parent_position_id INTO _ancestor, _pos
    FROM public.matrix_positions WHERE id = _parent;
    EXIT WHEN _ancestor IS NULL;

    INSERT INTO public.pv_transactions
      (user_id, source_user_id, order_id, product_id, pv_amount, type, level, period_month)
    VALUES (_ancestor, _order.user_id, _order_id, NULL, _total_pv, 'group', _lvl, _period);

    INSERT INTO public.pv_totals (user_id, period_month, personal_pv, group_pv)
    VALUES (_ancestor, _period, 0, _total_pv)
    ON CONFLICT (user_id, period_month) DO UPDATE
      SET group_pv = public.pv_totals.group_pv + EXCLUDED.group_pv, updated_at = now();

    _parent := _pos;
  END LOOP;
END; $$;

-- 5. Wallet-paid orders now credit PV inside the same transaction
CREATE OR REPLACE FUNCTION public.pay_order_from_wallet(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  PERFORM public.apply_order_pv(_order_id);
END; $$;

-- 6. PV totals recompute is now incremental-safe: only fills gaps, never clobbers
CREATE OR REPLACE FUNCTION public.process_pv_totals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _period DATE := date_trunc('month', CURRENT_DATE)::date; _rows INT := 0;
BEGIN
  -- backfill any paid order in this period that never produced PV rows
  PERFORM public.apply_order_pv(o.id)
  FROM public.orders o
  WHERE o.payment_state = 'paid'
    AND date_trunc('month', o.created_at)::date = _period
    AND NOT EXISTS (SELECT 1 FROM public.pv_transactions t WHERE t.order_id = o.id);

  WITH agg AS (
    SELECT user_id, period_month,
           COALESCE(sum(pv_amount) FILTER (WHERE type = 'personal'), 0)::int AS ppv,
           COALESCE(sum(pv_amount) FILTER (WHERE type = 'group'), 0)::int AS gpv
    FROM public.pv_transactions WHERE period_month = _period
    GROUP BY user_id, period_month
  ), ins AS (
    INSERT INTO public.pv_totals (user_id, period_month, personal_pv, group_pv)
    SELECT user_id, period_month, ppv, gpv FROM agg
    ON CONFLICT (user_id, period_month) DO UPDATE
      SET personal_pv = EXCLUDED.personal_pv, group_pv = EXCLUDED.group_pv, updated_at = now()
    RETURNING id
  ) SELECT count(*) INTO _rows FROM ins;

  RETURN jsonb_build_object('period', _period, 'records', _rows);
END; $$;

-- 7. Rank evaluation: promotion first, then demotion, with snapshot + notification
CREATE OR REPLACE FUNCTION public.process_rank_advancement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _period DATE := date_trunc('month', CURRENT_DATE)::date;
  _promoted INT := 0; _demoted INT := 0;
  _floor TEXT;
  _m RECORD; _target TEXT; _target_level INT; _cur_level INT; _snapshot jsonb;
BEGIN
  SELECT key INTO _floor FROM public.ranks ORDER BY level ASC LIMIT 1;

  FOR _m IN
    SELECT m.id AS user_id, m.rank_key,
           COALESCE(pv.personal_pv, 0) AS ppv,
           COALESCE(pv.group_pv, 0) AS gpv,
           (SELECT count(*) FROM public.profiles p JOIN public.members dm ON dm.id = p.id
             WHERE p.referrer_id = m.id AND dm.status = 'active' AND dm.license_status = 'active') AS dirs,
           (m.status = 'active' AND m.license_status = 'active') AS licensed
    FROM public.members m
    LEFT JOIN public.pv_totals pv ON pv.user_id = m.id AND pv.period_month = _period
  LOOP
    SELECT r.key, r.level INTO _target, _target_level
    FROM public.ranks r
    WHERE _m.ppv >= r.min_personal_pv
      AND _m.gpv >= r.min_group_pv
      AND _m.dirs >= r.min_active_directs
      AND (NOT r.leadership_qualified OR _m.licensed)
    ORDER BY r.level DESC LIMIT 1;

    IF _target IS NULL THEN
      _target := _floor;
      SELECT level INTO _target_level FROM public.ranks WHERE key = _floor;
    END IF;

    SELECT level INTO _cur_level FROM public.ranks WHERE key = _m.rank_key;
    CONTINUE WHEN _target_level = COALESCE(_cur_level, 0);

    _snapshot := jsonb_build_object(
      'personal_pv', _m.ppv, 'group_pv', _m.gpv, 'active_directs', _m.dirs,
      'licensed', _m.licensed, 'period', _period
    );

    UPDATE public.members SET rank_key = _target WHERE id = _m.user_id;

    INSERT INTO public.rank_history (user_id, from_rank, to_rank, reason, direction, snapshot, period_month)
    VALUES (_m.user_id, _m.rank_key, _target,
      CASE WHEN _target_level > COALESCE(_cur_level, 0)
           THEN 'Monthly rank evaluation — promotion'
           ELSE 'Monthly rank evaluation — re-qualification not met' END,
      CASE WHEN _target_level > COALESCE(_cur_level, 0) THEN 'promotion' ELSE 'demotion' END,
      _snapshot, _period);

    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    SELECT _m.user_id, 'member',
      CASE WHEN _target_level > COALESCE(_cur_level, 0) THEN 'rank_up' ELSE 'rank_down' END,
      CASE WHEN _target_level > COALESCE(_cur_level, 0)
           THEN 'Rank advanced to ' || r.name ELSE 'Rank adjusted to ' || r.name END,
      CASE WHEN _target_level > COALESCE(_cur_level, 0)
           THEN 'Congratulations — your KM Prime rank is now ' || r.name || '.'
           ELSE 'Your rank changed to ' || r.name || ' because this period''s figures ('
                || _m.ppv || ' personal PV, ' || _m.gpv || ' group PV, ' || _m.dirs
                || ' active directs) no longer meet your previous rank. Commissions already paid are unaffected.' END
    FROM public.ranks r WHERE r.key = _target;

    IF _target_level > COALESCE(_cur_level, 0) THEN _promoted := _promoted + 1;
    ELSE _demoted := _demoted + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('period', _period, 'promoted', _promoted, 'demoted', _demoted);
END; $$;

-- 8. Archive + reset PV at the close of a period
CREATE OR REPLACE FUNCTION public.archive_pv_period(_period date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _rows int := 0;
BEGIN
  WITH ins AS (
    INSERT INTO public.pv_period_history (user_id, period_month, personal_pv, group_pv, rank_key)
    SELECT pv.user_id, pv.period_month, pv.personal_pv, pv.group_pv, m.rank_key
    FROM public.pv_totals pv LEFT JOIN public.members m ON m.id = pv.user_id
    WHERE pv.period_month = _period
    ON CONFLICT (user_id, period_month) DO UPDATE
      SET personal_pv = EXCLUDED.personal_pv, group_pv = EXCLUDED.group_pv, rank_key = EXCLUDED.rank_key
    RETURNING id
  ) SELECT count(*) INTO _rows FROM ins;
  RETURN jsonb_build_object('archived_period', _period, 'records', _rows);
END; $$;

-- 9. Monthly cycle: close previous period, then evaluate the current one
CREATE OR REPLACE FUNCTION public.process_monthly_cycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _period DATE := date_trunc('month', CURRENT_DATE)::date;
  _prev DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date;
  _archive jsonb; _pv jsonb; _rank jsonb; _matrix jsonb; _lead jsonb;
BEGIN
  _archive := public.archive_pv_period(_prev);
  _pv := public.process_pv_totals();
  _rank := public.process_rank_advancement();
  _matrix := public.process_matrix_commissions();
  _lead := public.process_leadership_bonus();
  RETURN jsonb_build_object('archive', _archive, 'pv', _pv, 'ranks', _rank,
                            'matrix', _matrix, 'leadership', _lead);
END; $$;

-- 10. PV visibility permission for managers
INSERT INTO public.role_permissions (role, permission_key, granted)
VALUES ('manager', 'reports.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET granted = true;