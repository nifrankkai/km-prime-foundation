export const PERMISSION_KEYS = [
  "members.manage",
  "members.wallet",
  "kyc.review",
  "withdrawals.review",
  "deposits.review",
  "products.manage",
  "orders.manage",
  "stock.manage",
  "commissions.manage",
  "ranks.manage",
  "announcements.manage",
  "gallery.manage",
  "reports.view",
  "staff.manage",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "members.manage": "Member management",
  "members.wallet": "Wallet adjustments",
  "kyc.review": "KYC review",
  "withdrawals.review": "Withdrawal approvals",
  "deposits.review": "Deposit approvals",
  "products.manage": "Product management",
  "orders.manage": "Order management",
  "stock.manage": "Stock & shipments",
  "commissions.manage": "Commission oversight",
  "ranks.manage": "Rank thresholds",
  "announcements.manage": "Announcements",
  "gallery.manage": "Member gallery",
  "reports.view": "Reports",
  "staff.manage": "Staff & roles",
  "settings.manage": "Platform settings",
};

export const ROLE_KEYS = ["super_admin", "manager", "mini_admin", "stockist"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Administrator",
  manager: "Manager",
  mini_admin: "Mini Admin",
  stockist: "Stockist",
};
