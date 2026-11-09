"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Menu, Scissors, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Inicio", icon: House },
  { href: "/admin/citas", label: "Citas", icon: CalendarDays },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/servicios", label: "Servicios", icon: Scissors },
  { href: "/admin/mas", label: "Más", icon: Menu },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Secciones del panel"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-graphite bg-background pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition",
              active ? "font-bold text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.5 : 1.8} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
