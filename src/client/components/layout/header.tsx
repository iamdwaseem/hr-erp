import React from "react";
import { Menu, LogOut, User, Activity } from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card/90 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* System edge status */}
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          <span>Cloudflare Edge</span>
        </div>

        {/* User Info & Role Badge */}
        {user && (
          <div className="flex items-center gap-3 border-l pl-3 sm:pl-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden flex-col text-left text-xs sm:flex">
                <span className="font-semibold text-foreground truncate max-w-[120px]">
                  {user.fullName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
            </div>

            <Badge
              variant={user.role === "ADMIN" ? "default" : "secondary"}
              className="capitalize hidden md:inline-flex"
            >
              {user.role.replace("_", " ")}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
