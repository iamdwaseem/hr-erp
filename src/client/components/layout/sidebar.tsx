import React from "react";
import { LayoutDashboard, Users, AlertCircle, History, Shield, X, User as UserIcon } from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { cn } from "../../lib/utils";
import { ROLES, type UserRole, PERMISSIONS } from "../../../shared/constants/roles";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
  roles?: readonly UserRole[];
  excludeRoles?: readonly UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: "HR Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Profile",
    href: "/profile",
    icon: UserIcon,
    roles: [ROLES.EMPLOYEE],
  },
  {
    title: "Employee Master",
    href: "/employees",
    icon: Users,
    permission: PERMISSIONS.EMPLOYEE_READ,
    excludeRoles: [ROLES.EMPLOYEE],
  },
  {
    title: "HR Action Center",
    href: "/action-center",
    icon: AlertCircle,
    badge: "Alerts",
    excludeRoles: [ROLES.EMPLOYEE],
  },
  {
    title: "Basic Audit Log",
    href: "/audit",
    icon: History,
    permission: PERMISSIONS.AUDIT_READ,
    excludeRoles: [ROLES.EMPLOYEE],
  },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (href: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { can, user } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (!user) return false;
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(user.role)) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand / Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2 font-bold tracking-tight text-lg text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm">
              HR
            </div>
            <span>HR ERP Platform</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;

            return (
              <button
                key={item.href}
                onClick={() => {
                  onNavigate(item.href);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-amber-500/10 text-amber-600"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Role Card at bottom */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold capitalize text-foreground">
                  {user.role.replace("_", " ")}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  RBAC Active
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
