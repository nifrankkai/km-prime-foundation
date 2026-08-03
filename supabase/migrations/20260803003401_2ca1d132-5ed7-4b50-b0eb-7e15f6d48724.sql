CREATE TABLE public.email_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  smtp_encryption text NOT NULL DEFAULT 'tls',
  from_name text NOT NULL DEFAULT 'KM Prime',
  from_email text NOT NULL DEFAULT '',
  reply_to text,
  action_emails_enabled boolean NOT NULL DEFAULT false,
  notification_emails_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read mail settings" ON public.email_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update mail settings" ON public.email_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins insert mail settings" ON public.email_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER email_settings_updated_at BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_settings (id) VALUES (true);

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'notification',
  subject text NOT NULL,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_templates (key, name, category, subject, body, sort_order) VALUES
('auth_signup_confirmation', 'Sign-up confirmation', 'action', 'Confirm your KM Prime account', E'Hi {{full_name}},\n\nWelcome to KM Prime. Confirm your email address to finish creating your account:\n\n{{action_url}}\n\nIf you did not sign up, you can ignore this email.', 1),
('auth_password_reset', 'Password reset', 'action', 'Reset your KM Prime password', E'Hi {{full_name}},\n\nUse the link below to choose a new password:\n\n{{action_url}}\n\nThis link expires in 60 minutes.', 2),
('auth_magic_link', 'Magic sign-in link', 'action', 'Your KM Prime sign-in link', E'Hi {{full_name}},\n\nSign in to KM Prime with this link:\n\n{{action_url}}', 3),
('auth_email_change', 'Email change confirmation', 'action', 'Confirm your new email address', E'Hi {{full_name}},\n\nConfirm your new email address for KM Prime:\n\n{{action_url}}', 4),
('account_welcome', 'Welcome email', 'notification', 'Welcome to KM Prime', E'Hi {{full_name}},\n\nYour KM Prime account has been created. Activate your membership to unlock the compensation plan.\n\n{{dashboard_url}}', 10),
('account_activated', 'Account activated', 'notification', 'Your KM Prime account is active', E'Hi {{full_name}},\n\nYour membership package and business license are active. Your matrix position has been assigned and you can now earn on the full compensation plan.\n\n{{dashboard_url}}', 11),
('license_renewal_reminder', 'License renewal reminder', 'notification', 'Your business license needs renewal', E'Hi {{full_name}},\n\nYour $10 monthly business license payment is due. You have {{grace_days_left}} day(s) of grace remaining before bonuses are paused.\n\n{{dashboard_url}}', 12),
('license_expired', 'License expired', 'notification', 'Your business license is inactive', E'Hi {{full_name}},\n\nYour business license has expired and your matrix position has been released. Pay the $10 license fee to be re-placed in the next open position in your upline.\n\n{{dashboard_url}}', 13),
('withdrawal_pending', 'Withdrawal pending', 'notification', 'Withdrawal request received', E'Hi {{full_name}},\n\nWe received your withdrawal request of {{amount}} to {{destination}}. It is now pending review.', 20),
('withdrawal_confirmed', 'Withdrawal approved', 'notification', 'Withdrawal approved', E'Hi {{full_name}},\n\nYour withdrawal of {{amount}} has been approved and sent to {{destination}}.', 21),
('withdrawal_cancelled', 'Withdrawal rejected', 'notification', 'Withdrawal request rejected', E'Hi {{full_name}},\n\nYour withdrawal request of {{amount}} was rejected.\n\nReason: {{reason}}\n\nThe amount remains in your wallet balance.', 22),
('deposit_pending', 'Deposit pending', 'notification', 'Deposit pending confirmation', E'Hi {{full_name}},\n\nWe received your deposit of {{amount}} via {{payment_method}}. It is pending confirmation.', 30),
('deposit_confirmed', 'Deposit confirmed', 'notification', 'Deposit confirmed', E'Hi {{full_name}},\n\nYour deposit of {{amount}} has been confirmed and credited to your wallet.\n\nNew balance: {{balance}}', 31),
('deposit_cancelled', 'Deposit cancelled', 'notification', 'Deposit cancelled', E'Hi {{full_name}},\n\nYour deposit of {{amount}} could not be confirmed and has been cancelled.\n\nReason: {{reason}}', 32),
('order_placed', 'Order placed', 'notification', 'Order {{order_reference}} received', E'Hi {{full_name}},\n\nThanks for your order {{order_reference}} totalling {{amount}} ({{total_pv}} PV). We will notify you when it ships.', 40),
('order_paid', 'Order payment confirmed', 'notification', 'Payment confirmed for {{order_reference}}', E'Hi {{full_name}},\n\nWe have confirmed payment for order {{order_reference}}. It is now being prepared for shipment.', 41),
('order_shipped', 'Order shipped', 'notification', 'Order {{order_reference}} shipped', E'Hi {{full_name}},\n\nYour order {{order_reference}} is on its way. Confirm delivery in your dashboard once it arrives.\n\n{{dashboard_url}}', 42),
('order_cancelled', 'Order cancelled', 'notification', 'Order {{order_reference}} cancelled', E'Hi {{full_name}},\n\nYour order {{order_reference}} has been cancelled.\n\nReason: {{reason}}', 43),
('kyc_approved', 'KYC approved', 'notification', 'Your identity verification is approved', E'Hi {{full_name}},\n\nYour KYC documents have been approved. You can now request withdrawals.', 50),
('kyc_rejected', 'KYC rejected', 'notification', 'Identity verification needs attention', E'Hi {{full_name}},\n\nYour KYC submission was rejected.\n\nReason: {{reason}}\n\nPlease resubmit your documents.', 51),
('commission_credited', 'Commission credited', 'notification', 'Commission credited to your wallet', E'Hi {{full_name}},\n\n{{amount}} in {{commission_type}} commission has been credited to your wallet for {{period}}.\n\nNew balance: {{balance}}', 60),
('rank_advanced', 'Rank advancement', 'notification', 'Congratulations on your new rank', E'Hi {{full_name}},\n\nYou have advanced to {{rank_name}}. Your unlocked matrix levels and bonuses have been updated.', 61);