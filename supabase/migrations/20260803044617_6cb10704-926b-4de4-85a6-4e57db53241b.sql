-- 1. Payment method configuration ------------------------------------------
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS network_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS receiving_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_deposit_cents INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS min_withdrawal_cents INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

UPDATE public.payment_methods SET network_label = 'TRC-20', fee_percent = 2.00 WHERE key = 'usdt';
UPDATE public.payment_methods SET network_label = '', fee_percent = 3.00 WHERE key = 'mobile_money';

-- 2. Payout destinations on the profile --------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS usdt_address TEXT,
  ADD COLUMN IF NOT EXISTS mobile_money_number TEXT;

-- 3. Withdrawal PIN ----------------------------------------------------------
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS withdrawal_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_cents INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.has_withdrawal_pin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE id = _user_id AND withdrawal_pin_hash IS NOT NULL);
$$;

-- A member may only set a PIN when none exists; changing it requires an admin reset.
CREATE OR REPLACE FUNCTION public.set_withdrawal_pin(_pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be exactly 4 digits'; END IF;
  IF EXISTS (SELECT 1 FROM public.members WHERE id = _uid AND withdrawal_pin_hash IS NOT NULL) THEN
    RAISE EXCEPTION 'A withdrawal PIN is already set. Open a support ticket to request a reset.';
  END IF;
  UPDATE public.members
    SET withdrawal_pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf')), pin_set_at = now()
  WHERE id = _uid;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reset_withdrawal_pin(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_permission(_uid, 'reset_withdrawal_pin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.members SET withdrawal_pin_hash = NULL, pin_set_at = NULL WHERE id = _user_id;
  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (_user_id, 'member', 'security', 'Withdrawal PIN reset',
          'An administrator cleared your withdrawal PIN. Set a new 4-digit PIN from the Wallet page before your next withdrawal.');
END; $$;

-- 4. Withdrawal request now requires the PIN and records the fee -------------
DROP FUNCTION IF EXISTS public.request_withdrawal(integer, public.payment_method, text);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount_cents INTEGER, _method public.payment_method, _destination TEXT, _pin TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  _uid uuid := auth.uid(); _kyc public.kyc_status; _wallet RECORD; _pending integer; _id uuid;
  _hash text; _fee_percent numeric := 0; _min integer := 1000; _fee integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT withdrawal_pin_hash INTO _hash FROM public.members WHERE id = _uid;
  IF _hash IS NULL THEN RAISE EXCEPTION 'PIN_NOT_SET'; END IF;
  IF _hash <> extensions.crypt(_pin, _hash) THEN RAISE EXCEPTION 'INVALID_PIN'; END IF;

  SELECT COALESCE(min_withdrawal_cents, 1000), COALESCE(fee_percent, 0)
    INTO _min, _fee_percent
  FROM public.payment_methods WHERE key = _method::text;

  IF _amount_cents < COALESCE(_min, 1000) THEN
    RAISE EXCEPTION 'Minimum withdrawal is $%', to_char(COALESCE(_min,1000)/100.0, 'FM999990.00');
  END IF;

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

  _fee := round(_amount_cents * COALESCE(_fee_percent, 0) / 100.0)::int;

  INSERT INTO public.withdrawal_requests (user_id, amount_cents, method, destination, fee_cents, net_cents)
  VALUES (_uid, _amount_cents, _method, _destination, _fee, _amount_cents - _fee)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- 5. Support tickets ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM (
    'withdrawal_pin_reset', 'deposit_issue', 'withdrawal_issue', 'account_issue', 'general_question', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'general_question',
  status public.ticket_status NOT NULL DEFAULT 'open',
  last_reply_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  attachment_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Support staff read all tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_support_tickets'));
CREATE POLICY "Members read own ticket messages" ON public.support_ticket_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Support staff read all ticket messages" ON public.support_ticket_messages
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'manage_support_tickets'));

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  _subject TEXT, _category public.ticket_category, _message TEXT, _attachment_path TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _id UUID; _name TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(_subject)) < 3 THEN RAISE EXCEPTION 'Subject is too short'; END IF;
  IF length(trim(_message)) < 5 THEN RAISE EXCEPTION 'Message is too short'; END IF;

  INSERT INTO public.support_tickets (user_id, subject, category)
  VALUES (_uid, trim(_subject), _category) RETURNING id INTO _id;

  INSERT INTO public.support_ticket_messages (ticket_id, author_id, is_staff, body, attachment_path)
  VALUES (_id, _uid, false, trim(_message), _attachment_path);

  SELECT COALESCE(NULLIF(full_name, ''), email) INTO _name FROM public.profiles WHERE id = _uid;

  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (NULL, 'admin', 'support', 'New support ticket: ' || trim(_subject),
          COALESCE(_name, 'A member') || ' opened a ' || replace(_category::text, '_', ' ') || ' ticket.');

  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.add_ticket_reply(_ticket_id UUID, _body TEXT, _attachment_path TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _ticket RECORD; _staff BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(_body)) < 2 THEN RAISE EXCEPTION 'Reply is too short'; END IF;

  SELECT * INTO _ticket FROM public.support_tickets WHERE id = _ticket_id;
  IF _ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  _staff := public.has_permission(_uid, 'manage_support_tickets');
  IF NOT _staff AND _ticket.user_id <> _uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _ticket.status = 'closed' THEN RAISE EXCEPTION 'This ticket is closed. Please open a new ticket.'; END IF;

  INSERT INTO public.support_ticket_messages (ticket_id, author_id, is_staff, body, attachment_path)
  VALUES (_ticket_id, _uid, _staff, trim(_body), _attachment_path);

  UPDATE public.support_tickets
    SET last_reply_at = now(),
        status = CASE WHEN _staff AND status = 'open' THEN 'in_progress'::public.ticket_status ELSE status END
  WHERE id = _ticket_id;

  IF _staff THEN
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    VALUES (_ticket.user_id, 'member', 'support', 'Reply on your ticket: ' || _ticket.subject,
            'Support responded to your ticket. Open the Support page to read the reply.');
  ELSE
    INSERT INTO public.notifications (user_id, audience, kind, title, body)
    VALUES (NULL, 'admin', 'support', 'Ticket reply: ' || _ticket.subject, 'A member replied to their support ticket.');
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_ticket_status(_ticket_id UUID, _status public.ticket_status)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _ticket RECORD;
BEGIN
  IF NOT public.has_permission(_uid, 'manage_support_tickets') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _ticket FROM public.support_tickets WHERE id = _ticket_id;
  IF _ticket IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;

  UPDATE public.support_tickets SET status = _status WHERE id = _ticket_id;

  INSERT INTO public.notifications (user_id, audience, kind, title, body)
  VALUES (_ticket.user_id, 'member', 'support', 'Ticket ' || replace(_status::text, '_', ' ') || ': ' || _ticket.subject,
          'The status of your support ticket is now ' || replace(_status::text, '_', ' ') || '.');
END; $$;

-- 6. New permission keys -----------------------------------------------------
INSERT INTO public.role_permissions (role, permission_key, granted) VALUES
  ('super_admin', 'adjust_balance', true),
  ('super_admin', 'reset_withdrawal_pin', true),
  ('super_admin', 'manage_support_tickets', true),
  ('manager', 'adjust_balance', true),
  ('manager', 'reset_withdrawal_pin', false),
  ('manager', 'manage_support_tickets', true),
  ('mini_admin', 'adjust_balance', false),
  ('mini_admin', 'reset_withdrawal_pin', false),
  ('mini_admin', 'manage_support_tickets', true),
  ('stockist', 'adjust_balance', false),
  ('stockist', 'reset_withdrawal_pin', false),
  ('stockist', 'manage_support_tickets', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Balance adjustment now uses its own dedicated permission key.
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount_cents integer, _note text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_permission(_uid, 'adjust_balance') OR public.has_permission(_uid, 'members.wallet')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount_cents = 0 THEN RAISE EXCEPTION 'Amount must not be zero'; END IF;
  IF length(trim(COALESCE(_note, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  RETURN public.wallet_apply(_user_id,
    CASE WHEN _amount_cents > 0 THEN 'admin_credit'::public.transaction_type ELSE 'admin_debit'::public.transaction_type END,
    _amount_cents, NULL, _note, _uid);
END; $$;