# KM Prime Foundation

Build the foundation of KM Prime, a membership + e-commerce platform.

DESIGN SYSTEM — KM PRIME

Brand name: KM Prime (do not use any other company name)

Visual style: Clean wellness/finance-hybrid aesthetic. White background,

single confident accent color (green — use a rich emerald/kelly green,

not mint), generous whitespace, rounded corners on cards and buttons

(12-16px radius), product/content images with soft drop shadows on

transparent backgrounds.

Typography: Bold, geometric sans-serif for headlines (weight 700-800),

clean readable sans-serif for body text. Strong size contrast between

headline and body — headlines should feel confident and large.

Components:

- Buttons: solid green fill, white text, rounded, subtle hover lift

- Cards: white background, soft shadow, rounded corners, thin border

- Price displays: show two price points side by side when relevant

  (e.g. crossed-out original + highlighted discounted/member price)

- Icon+text rows: small icon left, short label right, used for trust

  badges and feature lists rather than long paragraphs

- Tables: clean grid lines, checkmark/x icons for comparison rows,

  highlighted column for the "our product" column

Use the attached screenshots for LAYOUT, SPACING, and STYLE reference

only. Do not copy any text, logos, or brand names from the screenshots —

all copy and branding must be original KM Prime content only. 

PAGES TO BUILD:

1. Homepage

   - Hero section: headline + subheadline about premium products at

     fair prices, two CTAs ("Shop Products", "Become a Member")

   - Trust badges row (4 short icon+text items)

   - "Why KM Prime" story section (image + text split layout)

   - 3-column feature grid (Quality / Fair Pricing / Transparency)

   - Comparison table section (KM Prime vs. 2 generic competitor

     columns, feature rows with checkmarks)

   - Product carousel teaser (static/mock data for now)

   - Testimonials (3-across, photo + quote + name)

   - Closing CTA band

   - Footer with nav links, social icons placeholder, compliance

     disclaimer text area, company address placeholder

2. Navigation

   - Sticky top nav: Logo, Home, Shop, Become a Member, Login/Account

   - Shop mega-menu on hover/click: categories placeholder list

   - Mobile: hamburger menu with same structure

3. Auth pages

   - Registration page: name, email, phone, password, referrer

     username field (optional, validated against existing usernames),

     terms checkbox

   - Login page

   - On successful registration: create user with status = "Pending"

     (not yet Active — activation happens in Phase 2)

   - Use Supabase Auth for email/password

4. Placeholder dashboard shell

   - After login, redirect to a basic dashboard layout (sidebar nav +

     content area) with placeholder sections for: Profile, Membership

     Status, Matrix Tree, Wallet, Orders — just the shell/routing for

     now, no functional data yet

DATABASE:

Set up Supabase tables for: users (with status field: pending/active/

inactive), and a basic profile table (name, email, phone, referrer_id

self-referencing to users.id).

Keep this phase focused on structure and visuals — don't build the

matrix, commissions, or payment logic yet, that's Phase 2.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d614825-1a86-431e-b2e8-5aeb89bacdff).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
