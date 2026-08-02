import { Quote } from "lucide-react";

import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";

const testimonials = [
  {
    quote:
      "I compared the batch report line by line with what I was paying elsewhere. Same standard, noticeably lower price.",
    name: "Amira Zulkifli",
    role: "Member since 2024",
    photo: avatar1,
  },
  {
    quote:
      "The pricing page finally makes sense. Two numbers, no games — I knew exactly what membership was worth before I joined.",
    name: "Daniel Foo",
    role: "Member since 2023",
    photo: avatar2,
  },
  {
    quote:
      "Ordering, tracking and my referrals all sit in one dashboard. It feels like a proper platform, not a group chat.",
    name: "Nadia Rahman",
    role: "Member since 2025",
    photo: avatar3,
  },
];

export function Testimonials() {
  return (
    <section className="section-shell py-20">
      <div className="max-w-2xl">
        <span className="eyebrow">Member voices</span>
        <h2 className="mt-5 text-3xl sm:text-4xl">What members tell us.</h2>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.map((item) => (
          <figure
            key={item.name}
            className="rounded-2xl border border-border bg-card p-7 shadow-soft"
          >
            <Quote className="size-6 text-primary" />
            <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <img
                src={item.photo}
                alt={item.name}
                loading="lazy"
                width={512}
                height={512}
                className="size-11 rounded-full object-cover"
              />
              <span>
                <span className="block text-sm font-bold text-foreground">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{item.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
