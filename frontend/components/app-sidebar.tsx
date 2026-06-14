"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity02Icon,
  Alert02Icon,
  CloudUploadIcon,
  Home09Icon,
  Invoice03Icon,
} from "@hugeicons/core-free-icons";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: boolean;
};

const items: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: Home09Icon },
  { title: "Needs Action", href: "/needs-action", icon: Alert02Icon, badge: true },
  { title: "Claims", href: "/claims", icon: Invoice03Icon },
  { title: "Upload", href: "/upload", icon: CloudUploadIcon },
];

export function AppSidebar({ needsActionCount }: { needsActionCount: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HugeiconsIcon icon={Activity02Icon} className="size-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">ClaimGuard</span>
            <span className="text-xs text-muted-foreground">Denial workflow</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && needsActionCount > 0 ? (
                    <SidebarMenuBadge>{needsActionCount}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <span className="px-2 text-xs text-muted-foreground">v0.1 · demo</span>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
