import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const title = "Create your account — KM Prime";
const description =
  "Register for a KM Prime membership account to unlock member pricing and referral rewards.";

const schema = z.object({
  fullName: z.string().trim().min(2, { message: "Enter your full name" }).max(100),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  phone: z
    .string()
    .trim()
    .min(7, { message: "Enter a valid phone number" })
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, { message: "Phone can contain digits and + - ( ) only" }),
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Letters, numbers and underscore only" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
  referrer: z
    .string()
    .trim()
    .max(30)
    .regex(/^[a-zA-Z0-9_]*$/, { message: "Letters, numbers and underscore only" }),
  terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
});

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [terms, setTerms] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      referrer: String(form.get("referrer") ?? ""),
      terms,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const data = parsed.data;

    if (data.referrer) {
      const { data: exists, error: rpcError } = await supabase.rpc("username_exists", {
        _username: data.referrer,
      });
      if (rpcError) {
        setLoading(false);
        toast.error("Could not verify the referrer username. Please try again.");
        return;
      }
      if (!exists) {
        setLoading(false);
        setErrors({ referrer: "We couldn't find a member with that username" });
        return;
      }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: data.fullName,
          phone: data.phone,
          username: data.username,
          referrer_username: data.referrer || null,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (signUpData.session) {
      toast.success("Account created — status is Pending review");
      navigate({ to: "/dashboard" });
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Your KM Prime account has been created with a Pending status."
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Go to login
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-primary-soft/50 p-5">
          <MailCheck className="mt-0.5 size-5 text-primary-deep" />
          <p className="text-sm text-foreground">
            Confirm your email address using the link we just sent, then sign in. Activation of your
            membership is reviewed separately.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Become a member"
      subtitle="Free to register. New accounts start as Pending."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
          {errors["fullName"] && <p className="text-xs text-destructive">{errors["fullName"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required />
          {errors["phone"] && <p className="text-xs text-destructive">{errors["phone"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" required />
          {errors["username"] && <p className="text-xs text-destructive">{errors["username"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="referrer">
            Referrer username <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="referrer" name="referrer" placeholder="Who invited you?" />
          {errors["referrer"] && <p className="text-xs text-destructive">{errors["referrer"]}</p>}
        </div>

        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="terms"
            checked={terms}
            onCheckedChange={(v) => setTerms(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-xs font-normal leading-relaxed text-muted-foreground">
            I agree to the KM Prime Terms of Service, Privacy Policy and membership rules.
          </Label>
        </div>
        {errors["terms"] && <p className="text-xs text-destructive">{errors["terms"]}</p>}

        <Button type="submit" variant="prime" size="xl" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
