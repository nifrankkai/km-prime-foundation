-- ENUMS
CREATE TYPE public.product_status AS ENUM ('active','inactive');
CREATE TYPE public.order_status AS ENUM ('pending_payment','awaiting_approval','paid','processing','shipped','delivered','cancelled');
CREATE TYPE public.payment_method AS ENUM ('visa','mastercard','usdt','mobile_money','bank_transfer','manual');
CREATE TYPE public.payment_state AS ENUM ('unpaid','pending_review','paid','failed','refunded');
CREATE TYPE public.kyc_status AS ENUM ('not_submitted','pending','approved','rejected');
CREATE TYPE public.payout_frequency AS ENUM ('weekly','monthly');

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  retail_price_cents INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  pv INTEGER NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  status public.product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE DEFAULT ('KMP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  payment_method public.payment_method NOT NULL,
  payment_state public.payment_state NOT NULL DEFAULT 'unpaid',
  payment_reference TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  total_pv INTEGER NOT NULL DEFAULT 0,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT '',
  state TEXT,
  postal_code TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image TEXT,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  pv INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Members create own order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'member',
  kind TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PV TOTALS
CREATE TABLE public.pv_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  personal_pv INTEGER NOT NULL DEFAULT 0,
  group_pv INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);
GRANT SELECT ON public.pv_totals TO authenticated;
GRANT ALL ON public.pv_totals TO service_role;
ALTER TABLE public.pv_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own PV" ON public.pv_totals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER pv_totals_updated_at BEFORE UPDATE ON public.pv_totals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMMISSION RULES
CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  commission_type public.commission_type NOT NULL,
  trigger_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  payout_formula TEXT NOT NULL,
  payout_frequency public.payout_frequency NOT NULL DEFAULT 'monthly',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commission_rules TO anon, authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Commission rules are public" ON public.commission_rules FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RANK THRESHOLDS
ALTER TABLE public.ranks
  ADD COLUMN IF NOT EXISTS min_personal_pv INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_group_pv INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_active_directs INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leadership_qualified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leadership_share NUMERIC NOT NULL DEFAULT 0;

UPDATE public.ranks SET min_personal_pv = v.ppv, min_group_pv = v.gpv, min_active_directs = v.dirs,
       leadership_qualified = v.lead, leadership_share = v.share
FROM (VALUES
  ('member',0,0,0,false,0.0),
  ('associate',50,200,2,false,0.0),
  ('bronze',100,1000,3,false,0.0),
  ('silver',150,3000,4,false,0.0),
  ('gold',200,8000,5,true,1.0),
  ('platinum',250,20000,6,true,1.5),
  ('diamond',300,50000,8,true,2.0),
  ('blue_diamond',350,120000,10,true,2.5),
  ('crown_diamond',400,250000,12,true,3.0),
  ('ambassador',500,500000,15,true,4.0)
) AS v(key,ppv,gpv,dirs,lead,share)
WHERE public.ranks.key = v.key;

-- RANK HISTORY
CREATE TABLE public.rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_rank TEXT,
  to_rank TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Automatic monthly evaluation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rank_history TO authenticated;
GRANT ALL ON public.rank_history TO service_role;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own rank history" ON public.rank_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- KYC
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  document_type TEXT NOT NULL DEFAULT 'national_id',
  id_document_path TEXT NOT NULL,
  selfie_path TEXT NOT NULL,
  address_proof_path TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own KYC" ON public.kyc_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members submit own KYC" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own pending KYC" ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status <> 'approved') WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DELIVERY CONFIRMATION
CREATE OR REPLACE FUNCTION public.confirm_order_received(_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ref TEXT; _uid UUID;
BEGIN
  SELECT reference, user_id INTO _ref, _uid FROM public.orders
  WHERE id = _order_id AND user_id = auth.uid() AND status = 'shipped';
  IF _ref IS NULL THEN RAISE EXCEPTION 'Order not found or not shipped'; END IF;

  UPDATE public.orders SET status = 'delivered', delivered_at = now() WHERE id = _order_id;

  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (NULL, 'admin', 'order_delivered', 'Delivery confirmed: ' || _ref,
          'A member confirmed receipt of order ' || _ref || '.');
  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (_uid, 'member', 'order_delivered', 'Thanks for confirming delivery',
          'Order ' || _ref || ' is now marked as delivered.');
END; $$;
REVOKE ALL ON FUNCTION public.confirm_order_received(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_received(UUID) TO authenticated;

-- PV RECALCULATION
CREATE OR REPLACE FUNCTION public.process_pv_totals()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _period DATE := date_trunc('month', CURRENT_DATE)::date; _rows INT := 0;
BEGIN
  WITH personal AS (
    SELECT o.user_id, COALESCE(sum(o.total_pv),0)::int AS ppv
    FROM public.orders o
    WHERE o.payment_state = 'paid' AND date_trunc('month', o.created_at)::date = _period
    GROUP BY o.user_id
  ),
  tree AS (
    SELECT mp.user_id AS root_id, c.id, c.user_id AS member_id, 1 AS depth
    FROM public.matrix_positions mp JOIN public.matrix_positions c ON c.parent_position_id = mp.id
    UNION ALL
    SELECT t.root_id, c.id, c.user_id, t.depth + 1
    FROM tree t JOIN public.matrix_positions c ON c.parent_position_id = t.id
    WHERE t.depth < 15
  ),
  grp AS (
    SELECT t.root_id AS user_id, COALESCE(sum(p.ppv),0)::int AS gpv
    FROM tree t LEFT JOIN personal p ON p.user_id = t.member_id
    GROUP BY t.root_id
  ),
  merged AS (
    SELECT COALESCE(p.user_id, g.user_id) AS user_id,
           COALESCE(p.ppv,0) AS ppv, COALESCE(g.gpv,0) AS gpv
    FROM personal p FULL OUTER JOIN grp g ON g.user_id = p.user_id
  ),
  ins AS (
    INSERT INTO public.pv_totals (user_id, period_month, personal_pv, group_pv)
    SELECT user_id, _period, ppv, gpv FROM merged
    ON CONFLICT (user_id, period_month) DO UPDATE
      SET personal_pv = EXCLUDED.personal_pv, group_pv = EXCLUDED.group_pv, updated_at = now()
    RETURNING id
  ) SELECT count(*) INTO _rows FROM ins;

  RETURN jsonb_build_object('period', _period, 'records', _rows);
END; $$;

-- RANK ADVANCEMENT
CREATE OR REPLACE FUNCTION public.process_rank_advancement()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _period DATE := date_trunc('month', CURRENT_DATE)::date; _promoted INT := 0;
BEGIN
  WITH stats AS (
    SELECT m.id AS user_id, m.rank_key,
           COALESCE(pv.personal_pv,0) AS ppv, COALESCE(pv.group_pv,0) AS gpv,
           (SELECT count(*) FROM public.profiles p JOIN public.members dm ON dm.id = p.id
             WHERE p.referrer_id = m.id AND dm.status = 'active' AND dm.license_status = 'active') AS dirs
    FROM public.members m
    LEFT JOIN public.pv_totals pv ON pv.user_id = m.id AND pv.period_month = _period
    WHERE m.status = 'active' AND m.license_status = 'active'
  ),
  target AS (
    SELECT s.user_id, s.rank_key AS from_rank,
           (SELECT r.key FROM public.ranks r
             WHERE s.ppv >= r.min_personal_pv AND s.gpv >= r.min_group_pv AND s.dirs >= r.min_active_directs
             ORDER BY r.level DESC LIMIT 1) AS to_rank
    FROM stats s
  ),
  promo AS (
    SELECT t.user_id, t.from_rank, t.to_rank
    FROM target t
    JOIN public.ranks rf ON rf.key = t.from_rank
    JOIN public.ranks rt ON rt.key = t.to_rank
    WHERE rt.level > rf.level
  ),
  upd AS (
    UPDATE public.members m SET rank_key = p.to_rank FROM promo p WHERE m.id = p.user_id RETURNING m.id
  ),
  log AS (
    INSERT INTO public.rank_history (user_id, from_rank, to_rank, reason)
    SELECT user_id, from_rank, to_rank, 'Monthly rank evaluation' FROM promo RETURNING id
  ),
  notif AS (
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    SELECT p.user_id, 'member', 'rank_up', 'Rank advanced to ' || r.name,
           'Congratulations — your KM Prime rank is now ' || r.name || '.'
    FROM promo p JOIN public.ranks r ON r.key = p.to_rank RETURNING id
  ) SELECT count(*) INTO _promoted FROM log;

  RETURN jsonb_build_object('period', _period, 'promoted', _promoted);
END; $$;

-- LEADERSHIP BONUS
CREATE OR REPLACE FUNCTION public.process_leadership_bonus()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _period DATE := date_trunc('month', CURRENT_DATE)::date; _rows INT := 0;
BEGIN
  WITH leaders AS (
    SELECT m.id AS user_id, r.leadership_share,
           COALESCE(pv.personal_pv,0) AS ppv, COALESCE(pv.group_pv,0) AS gpv,
           (SELECT count(*) FROM public.profiles p JOIN public.members dm ON dm.id = p.id
             WHERE p.referrer_id = m.id AND dm.status = 'active' AND dm.license_status = 'active') AS dirs
    FROM public.members m
    JOIN public.ranks r ON r.key = m.rank_key AND r.leadership_qualified
    LEFT JOIN public.pv_totals pv ON pv.user_id = m.id AND pv.period_month = _period
    WHERE m.status = 'active' AND m.license_status = 'active'
  ),
  ins AS (
    INSERT INTO public.commissions (user_id, type, status, amount_cents, volume, period_month, note)
    SELECT l.user_id, 'leadership',
           CASE WHEN l.dirs >= 2 THEN 'paid'::public.commission_status ELSE 'held'::public.commission_status END,
           round((l.ppv + l.gpv) * l.leadership_share)::int,
           (l.ppv + l.gpv), _period,
           'Leadership bonus — ' || l.leadership_share || '% of ' || (l.ppv + l.gpv) || ' PV'
    FROM leaders l WHERE (l.ppv + l.gpv) > 0
    ON CONFLICT (user_id, type, period_month) DO UPDATE
      SET amount_cents = EXCLUDED.amount_cents, volume = EXCLUDED.volume,
          status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()
    RETURNING id
  ) SELECT count(*) INTO _rows FROM ins;

  RETURN jsonb_build_object('period', _period, 'records', _rows);
END; $$;

-- MONTHLY CYCLE
CREATE OR REPLACE FUNCTION public.process_monthly_cycle()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pv jsonb; _rank jsonb; _matrix jsonb; _lead jsonb;
BEGIN
  _pv := public.process_pv_totals();
  _rank := public.process_rank_advancement();
  _matrix := public.process_matrix_commissions();
  _lead := public.process_leadership_bonus();
  RETURN jsonb_build_object('pv', _pv, 'ranks', _rank, 'matrix', _matrix, 'leadership', _lead);
END; $$;

REVOKE ALL ON FUNCTION public.process_pv_totals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_rank_advancement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_leadership_bonus() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_monthly_cycle() FROM PUBLIC;

-- SEED COMMISSION RULES
INSERT INTO public.commission_rules (key, name, commission_type, trigger_condition, payout_formula, payout_frequency, sort_order) VALUES
 ('direct_referral','Direct Referral Bonus','direct_referral','{"sponsored_active_min":1,"license_required":false}','25% of the sponsored member''s $65 package','weekly',1),
 ('matrix_commission','Matrix Commission','matrix','{"license_required":true,"sponsored_active_min":2}','$0.15 per active member in unlocked matrix levels','monthly',2),
 ('product_bonus','Product PV Bonus','product','{"license_required":true,"personal_pv_min":50}','10% of personal PV value','weekly',3),
 ('matching_bonus','Matching Bonus','matching','{"license_required":true,"sponsored_active_min":2}','20% of each personally sponsored member''s matrix commission','monthly',4),
 ('leadership_bonus','Leadership Bonus','leadership','{"license_required":true,"rank_min":"gold"}','Rank leadership share % of (personal PV + group PV)','monthly',5),
 ('rank_bonus','Rank Advancement Bonus','rank','{"license_required":true}','One-time payout on each rank promotion','monthly',6);

-- SEED PRODUCTS
INSERT INTO public.products (slug, name, description, category, retail_price_cents, price_cents, pv, stock_quantity, images) VALUES
 ('daily-defense-capsules','Daily Defense Capsules','A daily immune support formula built around vitamin C, zinc and elderberry extract. Third-party tested, non-GMO and made in an FDA-registered facility.','Immunity',4995,3295,30,240,'{"/products/product-1.jpg"}'),
 ('radiance-collagen-blend','Radiance Collagen Blend','Hydrolysed marine collagen peptides with hyaluronic acid and vitamin C to support skin elasticity, hair strength and joint comfort.','Beauty',6495,4295,40,180,'{"/products/product-2.jpg"}'),
 ('clarity-botanical-oil','Clarity Botanical Oil','A cold-pressed botanical blend with omega-3s and lion''s mane to support focus, mood balance and daily mental clarity.','Focus',3995,2695,25,150,'{"/products/product-3.jpg"}'),
 ('prime-starter-set','Prime Starter Set','The complete KM Prime starter bundle: Daily Defense, Radiance Collagen and Clarity Botanical Oil at the best member value.','Bundle',15495,8995,90,90,'{"/products/product-4.jpg"}');