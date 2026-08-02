export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
