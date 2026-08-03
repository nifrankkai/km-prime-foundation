-- 1. Payment methods
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  method_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  instructions_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.payment_methods TO anon;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_methods (key, method_name, is_enabled, instructions_text, sort_order) VALUES
  ('mobile_money', 'Mobile Money', true, 'Send the amount to KM Prime Mobile Money: +233 55 000 0000 (Name: KM Prime Ltd). Use your username as the reference, then upload the confirmation screenshot below.', 1),
  ('usdt', 'USDT (TRC-20)', true, 'Send USDT on the TRON (TRC-20) network to: TXfKMPrimeWalletAddressExample1234. Only TRC-20 is supported. Upload the transaction screenshot after sending.', 2),
  ('visa', 'Visa', false, 'Card deposits are temporarily unavailable.', 3),
  ('mastercard', 'MasterCard', false, 'Card deposits are temporarily unavailable.', 4),
  ('bank_transfer', 'Bank Transfer', false, 'Bank transfers are temporarily unavailable.', 5);

-- 2. Deposit requests
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_key text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  screenshot_path text NOT NULL,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;
GRANT ALL ON public.deposit_requests TO service_role;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own deposits" ON public.deposit_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_permission(auth.uid(), 'deposits.review'));
CREATE POLICY "Members create own deposits" ON public.deposit_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE TRIGGER deposit_requests_updated_at BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX deposit_requests_status_idx ON public.deposit_requests (status, submitted_at);

-- 3. Transaction type for deposits
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'deposit_credit';

-- 4. Permissions
INSERT INTO public.role_permissions (role, permission_key, granted) VALUES
  ('manager', 'deposits.review', true),
  ('mini_admin', 'deposits.review', false),
  ('stockist', 'deposits.review', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- 5. Storage policies for payment proofs
CREATE POLICY "Members upload own deposit proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members read own deposit proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
