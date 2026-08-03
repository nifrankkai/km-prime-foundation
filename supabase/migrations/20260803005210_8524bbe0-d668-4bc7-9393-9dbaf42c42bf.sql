CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site content is publicly readable"
  ON public.site_content FOR SELECT USING (true);

CREATE POLICY "Super admins insert site content"
  ON public.site_content FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update site content"
  ON public.site_content FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_content (key, title, content) VALUES
('footer_disclaimer', 'Compliance disclaimer', 'Statements about KM Prime products have not been evaluated by any regulatory authority and are not intended to diagnose, treat, cure, or prevent any disease. Membership income examples are illustrative only; earnings depend on individual effort and are not guaranteed.'),
('footer_address', 'Company address', '<p>KM Prime Sdn. Bhd. [Company registration no. placeholder]<br />[Street address placeholder]<br />[City, State, Postcode]<br />[Country]</p>'),
('page_privacy', 'Privacy Policy', '<h2>Overview</h2><p>This Privacy Policy explains what information KM Prime collects, how it is used, and the choices available to you. Replace this placeholder text from the admin console.</p><h2>Information we collect</h2><p>Account details, order details and support messages you provide.</p><h2>Contact</h2><p>Email us for privacy requests.</p>'),
('page_terms', 'Terms of Service', '<h2>Agreement</h2><p>By using KM Prime you agree to these terms. Replace this placeholder text from the admin console.</p><h2>Membership</h2><p>Membership and business licence terms apply as described on the membership page.</p>'),
('page_refund', 'Refund Policy', '<h2>Refunds</h2><p>Products may be returned in accordance with this policy. Replace this placeholder text from the admin console.</p><h2>How to request a refund</h2><p>Contact support with your order reference.</p>');