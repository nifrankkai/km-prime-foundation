CREATE TABLE public.site_branding (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  logo_url text,
  favicon_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.site_branding TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_branding TO authenticated;
GRANT ALL ON public.site_branding TO service_role;

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branding is public" ON public.site_branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admins insert branding" ON public.site_branding FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update branding" ON public.site_branding FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.site_branding (id) VALUES (true);