ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'account_info_change';

CREATE OR REPLACE FUNCTION public.lock_profile_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR public.has_permission(_uid, 'members.manage') THEN RETURN NEW; END IF;
  IF OLD.username IS NOT NULL THEN NEW.username := OLD.username; END IF;
  IF OLD.usdt_address IS NOT NULL THEN NEW.usdt_address := OLD.usdt_address; END IF;
  IF OLD.mobile_money_number IS NOT NULL THEN NEW.mobile_money_number := OLD.mobile_money_number; END IF;
  NEW.email := OLD.email;
  NEW.referrer_id := OLD.referrer_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lock_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER lock_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.lock_profile_sensitive_fields();

CREATE OR REPLACE FUNCTION public.admin_update_member_profile(
  _user_id uuid,
  _full_name text,
  _username text,
  _mobile_money_number text,
  _usdt_address text,
  _avatar_url text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _old RECORD; _changes jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.has_permission(_uid, 'members.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _old FROM public.profiles WHERE id = _user_id;
  IF _old IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  IF _username IS NOT NULL AND lower(_username) <> lower(COALESCE(_old.username, ''))
     AND EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username) AND id <> _user_id) THEN
    RAISE EXCEPTION 'That username is already taken';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(trim(_full_name), ''), full_name),
    username = COALESCE(NULLIF(trim(_username), ''), username),
    mobile_money_number = NULLIF(trim(COALESCE(_mobile_money_number, '')), ''),
    usdt_address = NULLIF(trim(COALESCE(_usdt_address, '')), ''),
    avatar_url = NULLIF(trim(COALESCE(_avatar_url, '')), ''),
    updated_at = now()
  WHERE id = _user_id;

  IF COALESCE(_old.full_name,'') IS DISTINCT FROM COALESCE(NULLIF(trim(_full_name),''), _old.full_name) THEN
    _changes := _changes || jsonb_build_object('full_name', jsonb_build_object('from', _old.full_name, 'to', trim(_full_name)));
  END IF;
  IF COALESCE(_old.username,'') IS DISTINCT FROM COALESCE(NULLIF(trim(_username),''), _old.username) THEN
    _changes := _changes || jsonb_build_object('username', jsonb_build_object('from', _old.username, 'to', trim(_username)));
  END IF;
  IF COALESCE(_old.mobile_money_number,'') IS DISTINCT FROM COALESCE(NULLIF(trim(COALESCE(_mobile_money_number,'')),''),'') THEN
    _changes := _changes || jsonb_build_object('mobile_money_number', jsonb_build_object('from', _old.mobile_money_number, 'to', _mobile_money_number));
  END IF;
  IF COALESCE(_old.usdt_address,'') IS DISTINCT FROM COALESCE(NULLIF(trim(COALESCE(_usdt_address,'')),''),'') THEN
    _changes := _changes || jsonb_build_object('usdt_address', jsonb_build_object('from', _old.usdt_address, 'to', _usdt_address));
  END IF;
  IF COALESCE(_old.avatar_url,'') IS DISTINCT FROM COALESCE(NULLIF(trim(COALESCE(_avatar_url,'')),''),'') THEN
    _changes := _changes || jsonb_build_object('avatar_url', jsonb_build_object('from', _old.avatar_url, 'to', _avatar_url));
  END IF;

  IF _changes <> '{}'::jsonb THEN
    PERFORM public.log_system_event(_uid, 'member.profile_updated',
      'Updated profile fields for ' || COALESCE(_old.email, _user_id::text),
      jsonb_build_object('target_user_id', _user_id, 'changes', _changes));
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    VALUES (_user_id, 'member', 'account', 'Account details updated',
            'An administrator updated your account details. Contact support if you did not request this.');
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_rank(
  _key text, _min_personal_pv integer, _min_group_pv integer, _min_active_directs integer,
  _unlocked_levels integer, _leadership_share numeric, _leadership_qualified boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _old RECORD;
BEGIN
  IF NOT public.has_permission(_uid, 'ranks.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _old FROM public.ranks WHERE key = _key;
  IF _old IS NULL THEN RAISE EXCEPTION 'Rank not found'; END IF;
  UPDATE public.ranks SET min_personal_pv = _min_personal_pv, min_group_pv = _min_group_pv,
    min_active_directs = _min_active_directs, unlocked_levels = _unlocked_levels,
    leadership_share = _leadership_share, leadership_qualified = _leadership_qualified
  WHERE key = _key;
  PERFORM public.log_system_event(_uid, 'rank.thresholds_updated', 'Updated thresholds for rank ' || _key,
    jsonb_build_object('rank', _key,
      'from', jsonb_build_object('min_personal_pv', _old.min_personal_pv, 'min_group_pv', _old.min_group_pv,
        'min_active_directs', _old.min_active_directs, 'unlocked_levels', _old.unlocked_levels,
        'leadership_share', _old.leadership_share, 'leadership_qualified', _old.leadership_qualified),
      'to', jsonb_build_object('min_personal_pv', _min_personal_pv, 'min_group_pv', _min_group_pv,
        'min_active_directs', _min_active_directs, 'unlocked_levels', _unlocked_levels,
        'leadership_share', _leadership_share, 'leadership_qualified', _leadership_qualified)));
END; $$;

CREATE OR REPLACE FUNCTION public.evaluate_rank_promotion(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _period date := date_trunc('month', CURRENT_DATE)::date;
  _rank_key text; _cur_level int; _ppv int; _gpv int; _dirs int; _licensed boolean;
  _target text; _target_level int;
BEGIN
  SELECT m.rank_key, (m.status = 'active' AND m.license_status = 'active')
    INTO _rank_key, _licensed FROM public.members m WHERE m.id = _user_id;
  IF _rank_key IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(personal_pv, 0), COALESCE(group_pv, 0) INTO _ppv, _gpv
  FROM public.pv_totals WHERE user_id = _user_id AND period_month = _period;
  _ppv := COALESCE(_ppv, 0); _gpv := COALESCE(_gpv, 0);

  SELECT count(*) INTO _dirs FROM public.profiles p JOIN public.members dm ON dm.id = p.id
   WHERE p.referrer_id = _user_id AND dm.status = 'active' AND dm.license_status = 'active';

  SELECT level INTO _cur_level FROM public.ranks WHERE key = _rank_key;

  SELECT r.key, r.level INTO _target, _target_level FROM public.ranks r
   WHERE _ppv >= r.min_personal_pv AND _gpv >= r.min_group_pv AND _dirs >= r.min_active_directs
     AND (NOT r.leadership_qualified OR COALESCE(_licensed, false))
   ORDER BY r.level DESC LIMIT 1;

  IF _target IS NULL OR _target_level <= COALESCE(_cur_level, 0) THEN RETURN NULL; END IF;

  UPDATE public.members SET rank_key = _target WHERE id = _user_id;

  INSERT INTO public.rank_history (user_id, from_rank, to_rank, reason, direction, snapshot, period_month)
  VALUES (_user_id, _rank_key, _target, 'Real-time promotion — thresholds met', 'promotion',
    jsonb_build_object('personal_pv', _ppv, 'group_pv', _gpv, 'active_directs', _dirs,
      'licensed', COALESCE(_licensed, false), 'period', _period), _period);

  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  SELECT _user_id, 'member', 'rank_up', 'Rank advanced to ' || r.name,
    'Congratulations — your KM Prime rank is now ' || r.name || '. New matrix levels and leadership eligibility apply from now on.'
  FROM public.ranks r WHERE r.key = _target;

  RETURN _target;
END; $$;

CREATE OR REPLACE FUNCTION public.pv_totals_realtime_rank()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.period_month = date_trunc('month', CURRENT_DATE)::date THEN
    PERFORM public.evaluate_rank_promotion(NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS pv_totals_realtime_rank ON public.pv_totals;
CREATE TRIGGER pv_totals_realtime_rank
AFTER INSERT OR UPDATE OF personal_pv, group_pv ON public.pv_totals
FOR EACH ROW EXECUTE FUNCTION public.pv_totals_realtime_rank();

INSERT INTO public.role_permissions (role, permission_key, granted)
SELECT r.role, 'members.impersonate', false
FROM (SELECT unnest(enum_range(NULL::app_role)) AS role) r
ON CONFLICT DO NOTHING;