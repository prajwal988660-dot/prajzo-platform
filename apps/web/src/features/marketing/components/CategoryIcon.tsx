import {
  AppWindow,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Plane,
  Printer,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Icons the service catalogue can name (categories store the icon's name). */
const icons: Record<string, LucideIcon> = {
  AppWindow,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Megaphone,
  Plane,
  Printer,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
  Wrench,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? LayoutTemplate;
  return <Icon aria-hidden="true" className={className} />;
}
