-- ENUMS
CREATE TYPE public.license_status AS ENUM ('active', 'inactive', 'grace_period');
CREATE TYPE public.commission_type AS ENUM ('matrix', 'direct_referral', 'matching', 'product', 'leadership', 'rank');
CREATE TYPE public.commission_status AS ENUM ('paid', 'held');
CREATE TYPE public.payment_kind AS ENUM ('membership_package', 'license_activation', 'license_renewal');
CREATE TYPE public.matrix_slot AS ENUM ('left', 'right');

-- RANKS
CREATE TABLE public.ranks (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level INT NOT NULL,
  required_directs INT NOT NULL DEFAULT 0,
  unlocked_levels INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ranks TO anon, authenticated;
GRANT ALL ON public.ranks TO service_role;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ranks are public" ON public.ranks FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.ranks (key, name, level, required_directs, unlocked_levels) VALUES
  ('member','Member',1,0,2),
  ('associate','Associate',2,2,4),
  ('bronze','Bronze',3,4,6),
  ('silver','Silver',4,6,8),
  ('gold','Gold',5,8,9),
  ('platinum','Platinum',6,10,10),
  ('diamond','Diamond',7,12,11),
  ('blue_diamond','Blue Diamond',8,15,12),
  ('crown_diamond','Crown Diamond',9,20,13),
  ('ambassador','Ambassador',10,25,15);

-- MEMBERS EXTENSIONS
ALTER TABLE public.members
  ADD COLUMN license_status public.license_status NOT NULL DEFAULT 'inactive',
  ADD COLUMN license_expiry_date DATE,
  ADD COLUMN grace_started_at TIMESTAMPTZ,
  ADD COLUMN activated_at TIMESTAMPTZ,
  ADD COLUMN rank_key TEXT NOT NULL DEFAULT 'member' REFERENCES public.ranks(key);

-- MATRIX POSITIONS
CREATE TABLE public.matrix_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_position_id UUID REFERENCES public.matrix_positions(id) ON DELETE SET NULL,
  slot public.matrix_slot,
  level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX matrix_positions_user_active_idx ON public.matrix_positions(user_id);
CREATE UNIQUE INDEX matrix_positions_parent_slot_idx ON public.matrix_positions(parent_position_id, slot) WHERE parent_position_id IS NOT NULL;
CREATE INDEX matrix_positions_parent_idx ON public.matrix_positions(parent_position_id);
GRANT SELECT ON public.matrix_positions TO authenticated;
GRANT ALL ON public.matrix_positions TO service_role;
ALTER TABLE public.matrix_positions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER matrix_positions_updated_at BEFORE UPDATE ON public.matrix_positions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LICENSE PAYMENTS
CREATE TABLE public.license_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.payment_kind NOT NULL,
  amount_cents INT NOT NULL,
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX license_payments_user_idx ON public.license_payments(user_id);
GRANT SELECT ON public.license_payments TO authenticated;
GRANT ALL ON public.license_payments TO service_role;
ALTER TABLE public.license_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own payments" ON public.license_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER license_payments_updated_at BEFORE UPDATE ON public.license_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMMISSIONS (wallet ledger)
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.commission_type NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'held',
  amount_cents INT NOT NULL DEFAULT 0,
  volume INT NOT NULL DEFAULT 0,
  period_month DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX commissions_user_type_period_idx ON public.commissions(user_id, type, period_month);
GRANT SELECT ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own commissions" ON public.commissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LICENSE REMINDERS (email trigger placeholder)
CREATE TABLE public.license_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_grace INT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX license_reminders_user_day_idx ON public.license_reminders(user_id, reminder_date);
GRANT SELECT ON public.license_reminders TO authenticated;
GRANT ALL ON public.license_reminders TO service_role;
ALTER TABLE public.license_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own reminders" ON public.license_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- DOWNLINE HELPER (security definer, avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_in_downline(_root UUID, _position UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.matrix_positions WHERE user_id = _root
    UNION ALL
    SELECT mp.id FROM public.matrix_positions mp JOIN tree t ON mp.parent_position_id = t.id
  )
  SELECT EXISTS (SELECT 1 FROM tree WHERE id = _position);
$$;
REVOKE EXECUTE ON FUNCTION public.is_in_downline(UUID, UUID) FROM anon;

CREATE POLICY "Members view own matrix subtree" ON public.matrix_positions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_in_downline(auth.uid(), id));

-- BFS PLACEMENT
CREATE OR REPLACE FUNCTION public.place_in_matrix(_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sponsor UUID;
  _sponsor_pos UUID;
  _frontier UUID[];
  _next UUID[];
  _cand UUID;
  _lvl INT := 0;
  _parent_level INT;
  _new_id UUID;
BEGIN
  SELECT id INTO _new_id FROM public.matrix_positions WHERE user_id = _user_id;
  IF _new_id IS NOT NULL THEN RETURN _new_id; END IF;

  SELECT referrer_id INTO _sponsor FROM public.profiles WHERE id = _user_id;

  IF _sponsor IS NULL THEN
    INSERT INTO public.matrix_positions (user_id, parent_position_id, slot, level)
    VALUES (_user_id, NULL, NULL, 0) RETURNING id INTO _new_id;
    RETURN _new_id;
  END IF;

  SELECT id INTO _sponsor_pos FROM public.matrix_positions WHERE user_id = _sponsor;
  IF _sponsor_pos IS NULL THEN
    _sponsor_pos := public.place_in_matrix(_sponsor);
  END IF;

  _frontier := ARRAY[_sponsor_pos];

  WHILE array_length(_frontier, 1) > 0 AND _lvl < 15 LOOP
    FOREACH _cand IN ARRAY _frontier LOOP
      SELECT level INTO _parent_level FROM public.matrix_positions WHERE id = _cand;
      IF _parent_level + 1 > 15 THEN CONTINUE; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.matrix_positions WHERE parent_position_id = _cand AND slot = 'left') THEN
        INSERT INTO public.matrix_positions (user_id, parent_position_id, slot, level)
        VALUES (_user_id, _cand, 'left', _parent_level + 1) RETURNING id INTO _new_id;
        RETURN _new_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.matrix_positions WHERE parent_position_id = _cand AND slot = 'right') THEN
        INSERT INTO public.matrix_positions (user_id, parent_position_id, slot, level)
        VALUES (_user_id, _cand, 'right', _parent_level + 1) RETURNING id INTO _new_id;
        RETURN _new_id;
      END IF;
    END LOOP;

    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) INTO _next
    FROM public.matrix_positions WHERE parent_position_id = ANY(_frontier);
    _frontier := _next;
    _lvl := _lvl + 1;
  END LOOP;

  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_in_matrix(UUID) FROM anon, authenticated;

-- ACTIVATION: $65 package + $10 license, places member in matrix
CREATE OR REPLACE FUNCTION public.activate_member(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.license_payments WHERE user_id = _user_id AND kind = 'membership_package') THEN
    INSERT INTO public.license_payments (user_id, kind, amount_cents) VALUES (_user_id, 'membership_package', 6500);
    INSERT INTO public.license_payments (user_id, kind, amount_cents, period_start, period_end)
    VALUES (_user_id, 'license_activation', 1000, CURRENT_DATE, CURRENT_DATE + 30);
  END IF;

  UPDATE public.members
  SET status = 'active',
      license_status = 'active',
      license_expiry_date = CURRENT_DATE + 30,
      grace_started_at = NULL,
      activated_at = COALESCE(activated_at, now())
  WHERE id = _user_id;

  PERFORM public.place_in_matrix(_user_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.activate_member(UUID) FROM anon, authenticated;

-- MONTHLY RENEWAL / LATE PAYMENT (re-entry at next open slot)
CREATE OR REPLACE FUNCTION public.pay_license(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _was_inactive BOOLEAN;
BEGIN
  SELECT license_status = 'inactive' INTO _was_inactive FROM public.members WHERE id = _user_id;

  INSERT INTO public.license_payments (user_id, kind, amount_cents, period_start, period_end)
  VALUES (_user_id, 'license_renewal', 1000, CURRENT_DATE, CURRENT_DATE + 30);

  UPDATE public.members
  SET license_status = 'active',
      status = 'active',
      grace_started_at = NULL,
      license_expiry_date = GREATEST(COALESCE(license_expiry_date, CURRENT_DATE), CURRENT_DATE) + 30
  WHERE id = _user_id;

  IF _was_inactive THEN
    PERFORM public.place_in_matrix(_user_id);
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.pay_license(UUID) FROM anon, authenticated;

-- DAILY GRACE PERIOD SWEEP
CREATE OR REPLACE FUNCTION public.process_license_grace()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entered INT := 0; _reminded INT := 0; _expired INT := 0;
BEGIN
  WITH upd AS (
    UPDATE public.members SET license_status = 'grace_period', grace_started_at = now()
    WHERE license_status = 'active' AND license_expiry_date IS NOT NULL AND license_expiry_date < CURRENT_DATE
    RETURNING id
  ) SELECT count(*) INTO _entered FROM upd;

  WITH rem AS (
    INSERT INTO public.license_reminders (user_id, day_of_grace)
    SELECT id, GREATEST(1, (CURRENT_DATE - grace_started_at::date))
    FROM public.members WHERE license_status = 'grace_period'
    ON CONFLICT (user_id, reminder_date) DO NOTHING
    RETURNING id
  ) SELECT count(*) INTO _reminded FROM rem;

  WITH exp AS (
    UPDATE public.members SET license_status = 'inactive'
    WHERE license_status = 'grace_period' AND grace_started_at < now() - INTERVAL '7 days'
    RETURNING id
  ), del AS (
    DELETE FROM public.matrix_positions WHERE user_id IN (SELECT id FROM exp) RETURNING id
  ) SELECT count(*) INTO _expired FROM exp;

  RETURN jsonb_build_object('entered_grace', _entered, 'reminders', _reminded, 'expired', _expired);
END; $$;
REVOKE EXECUTE ON FUNCTION public.process_license_grace() FROM anon, authenticated;

-- MONTHLY MATRIX COMMISSION JOB ($0.15 per active downline member, unlocked levels)
CREATE OR REPLACE FUNCTION public.process_matrix_commissions()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _period DATE := date_trunc('month', CURRENT_DATE)::date;
  _rows INT := 0;
BEGIN
  WITH earners AS (
    SELECT m.id AS user_id,
           mp.id AS position_id,
           r.unlocked_levels,
           (m.status = 'active' AND m.license_status = 'active'
             AND (SELECT count(*) FROM public.profiles p JOIN public.members dm ON dm.id = p.id
                  WHERE p.referrer_id = m.id AND dm.status = 'active' AND dm.license_status = 'active') >= 2
           ) AS qualified
    FROM public.members m
    JOIN public.matrix_positions mp ON mp.user_id = m.id
    JOIN public.ranks r ON r.key = m.rank_key
  ),
  tree AS (
    SELECT e.user_id, e.unlocked_levels, e.qualified, mp.id, mp.user_id AS member_id, 1 AS depth
    FROM earners e JOIN public.matrix_positions mp ON mp.parent_position_id = e.position_id
    UNION ALL
    SELECT t.user_id, t.unlocked_levels, t.qualified, mp.id, mp.user_id, t.depth + 1
    FROM tree t JOIN public.matrix_positions mp ON mp.parent_position_id = t.id
    WHERE t.depth < LEAST(t.unlocked_levels, 15)
  ),
  volume AS (
    SELECT t.user_id, bool_and(t.qualified) AS qualified, count(*)::int AS vol
    FROM tree t JOIN public.members dm ON dm.id = t.member_id
    WHERE dm.status = 'active' AND dm.license_status = 'active'
    GROUP BY t.user_id
  ),
  ins AS (
    INSERT INTO public.commissions (user_id, type, status, amount_cents, volume, period_month, note)
    SELECT v.user_id, 'matrix',
           CASE WHEN v.qualified THEN 'paid'::public.commission_status ELSE 'held'::public.commission_status END,
           (v.vol * 15), v.vol, _period,
           CASE WHEN v.qualified THEN 'Matrix commission' ELSE 'Held — qualification not met' END
    FROM volume v
    ON CONFLICT (user_id, type, period_month) DO UPDATE
      SET amount_cents = EXCLUDED.amount_cents, volume = EXCLUDED.volume,
          status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()
    RETURNING id
  ) SELECT count(*) INTO _rows FROM ins;

  RETURN jsonb_build_object('period', _period, 'records', _rows);
END; $$;
REVOKE EXECUTE ON FUNCTION public.process_matrix_commissions() FROM anon, authenticated;