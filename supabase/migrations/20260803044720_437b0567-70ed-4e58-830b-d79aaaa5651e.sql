CREATE OR REPLACE FUNCTION public.admin_set_payment_method(
  _key text,
  _is_enabled boolean,
  _instructions text,
  _network_label text DEFAULT NULL,
  _receiving_address text DEFAULT NULL,
  _min_deposit_cents integer DEFAULT NULL,
  _min_withdrawal_cents integer DEFAULT NULL,
  _fee_percent numeric DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payment_methods
  SET is_enabled = _is_enabled,
      instructions_text = COALESCE(_instructions, instructions_text),
      network_label = COALESCE(_network_label, network_label),
      receiving_address = COALESCE(_receiving_address, receiving_address),
      min_deposit_cents = GREATEST(0, COALESCE(_min_deposit_cents, min_deposit_cents)),
      min_withdrawal_cents = GREATEST(0, COALESCE(_min_withdrawal_cents, min_withdrawal_cents)),
      fee_percent = LEAST(100, GREATEST(0, COALESCE(_fee_percent, fee_percent)))
  WHERE key = _key;
END; $$;