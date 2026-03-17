"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Newspaper,
  Clock,
  Download,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/channels", label: "채널 목록", icon: List },
  { href: "/news", label: "뉴스 모니터링", icon: Newspaper },
  { href: "/audit-log", label: "변경 이력", icon: Clock },
  { href: "/export", label: "엑셀 다운로드", icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen border-r border-border-custom bg-white flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-7 bg-orange-500 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">OK</span>
        </div>
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          제휴 파트너 한눈에
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#FEF2F2] text-accent-red font-semibold"
                  : "text-muted-custom hover:bg-gray-50 font-medium"
              }`}
            >
              <Icon
                size={18}
                className={isActive ? "text-accent-red" : "text-muted-custom"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-custom">
        <p className="text-xs text-muted-custom">v2.0 Local</p>
      </div>
    </aside>
  );
}
