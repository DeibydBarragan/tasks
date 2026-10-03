import {
  Bike,
  BookOpen,
  Briefcase,
  CarFront,
  Coffee,
  Dumbbell,
  Folder,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Inbox,
  Music,
  PawPrint,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { LIST_ICON_KEYS } from "@/lib/list-icons";

const BY_KEY: Record<string, LucideIcon> = {
  inbox: Inbox,
  folder: Folder,
  food: UtensilsCrossed,
  coffee: Coffee,
  transport: Bike,
  car: CarFront,
  travel: Plane,
  home: House,
  health: HeartPulse,
  sport: Dumbbell,
  fun: Sparkles,
  music: Music,
  games: Gamepad2,
  reading: BookOpen,
  shopping: ShoppingBag,
  gift: Gift,
  bills: Receipt,
  pets: PawPrint,
  work: Briefcase,
  study: GraduationCap,
  tech: Smartphone,
  other: Tag,
};

export { LIST_ICON_KEYS };

export function ListIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const Cmp = BY_KEY[icon] ?? Tag;
  return <Cmp size={size} strokeWidth={2.2} aria-hidden />;
}
