import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { supabase } from "@/integrations/supabase/client";

const shopCategories = [
  { label: "Daily Essentials", note: "Everyday foundations" },
  { label: "Immunity & Defense", note: "Seasonal support" },
  { label: "Beauty & Skin", note: "Collagen and glow" },
  { label: "Energy & Focus", note: "Clean daily lift" },
  { label: "Home & Care", note: "Household staples" },
  { label: "Member Bundles", note: "Best value sets" },
];

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/membership", label: "Become a Member" },
] as const;

export function SiteHeader() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.label === "Shop" ? (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={() => setMegaOpen(true)}
                onMouseLeave={() => setMegaOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMegaOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Shop
                  <ChevronDown className="size-4" />
                </button>
                {megaOpen && (
                  <div className="absolute left-1/2 top-full w-[34rem] -translate-x-1/2 pt-3">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-lift">
                      <p className="eyebrow mb-4">Categories</p>
                      <div className="grid grid-cols-2 gap-2">
                        {shopCategories.map((cat) => (
                          <Link
                            key={cat.label}
                            to="/shop"
                            onClick={() => setMegaOpen(false)}
                            className="rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                          >
                            <span className="block text-sm font-semibold text-foreground">
                              {cat.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">{cat.note}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Button asChild variant="prime" size="sm">
              <Link to="/dashboard">
                <UserRound /> My Account
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="prime" size="sm">
                <Link to="/register">Join KM Prime</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[19rem]">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-2 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <p className="mt-4 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Categories
              </p>
              {shopCategories.map((cat) => (
                <Link
                  key={cat.label}
                  to="/shop"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
                >
                  {cat.label}
                </Link>
              ))}
              <div className="mt-6 flex flex-col gap-2">
                {signedIn ? (
                  <Button asChild variant="prime" size="lg" onClick={() => setMobileOpen(false)}>
                    <Link to="/dashboard">My Account</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="prime" size="lg" onClick={() => setMobileOpen(false)}>
                      <Link to="/register">Join KM Prime</Link>
                    </Button>
                    <Button
                      asChild
                      variant="primeGhost"
                      size="lg"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/login">Login</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
