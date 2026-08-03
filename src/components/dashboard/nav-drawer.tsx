import { useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

export type NavDrawerItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  tone?: "default" | "danger" | "accent";
};

export type NavDrawerGroup = {
  label?: string;
  items: NavDrawerItem[];
};

export function NavDrawer({
  groups,
  eyebrow,
  className,
}: {
  groups: NavDrawerGroup[];
  eyebrow?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className={cn(
          "grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <Menu className="size-4" />
      </button>

      <SheetContent
        side="left"
        className="app-dark w-[86vw] max-w-xs overflow-y-auto border-border bg-card p-0"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Main application navigation</SheetDescription>

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo />
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Close menu"
              className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          </SheetClose>
        </div>

        {eyebrow && (
          <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
        )}

        <nav className="flex flex-col gap-1 px-3 py-4">
          {groups.map((group, index) => (
            <div key={group.label ?? index} className="flex flex-col gap-1">
              {group.label && (
                <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    item.tone === "danger"
                      ? "font-semibold text-destructive hover:bg-destructive/10"
                      : "text-muted-foreground",
                  )}
                  activeProps={{
                    className:
                      item.tone === "danger"
                        ? "bg-destructive/10"
                        : "bg-primary-soft text-primary-deep",
                  }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
