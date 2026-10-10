export const navItems = [
  { label: "Bosh sahifa", href: "/" },
  { label: "Kinolar", href: "/movies" },
  { label: "Aktyorlar", href: "/actors" },
  { label: "Banner", href: "/banners" },
] as const;

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
