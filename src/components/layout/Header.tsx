import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  LogOut,
  User,
  Shield,
  Users,
  Code,
  Bell,
  Search,
  Menu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const roleIcons: Record<Role, React.ElementType> = {
  admin: Shield,
  manager: Users,
  developer: Code,
};

const roleColors: Record<Role, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  manager:
    "bg-status-inprogress/10 text-status-inprogress border-status-inprogress/20",
  developer: "bg-primary/10 text-primary border-primary/20",
};

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, currentRole, switchRole, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const RoleIcon = roleIcons[currentRole];

  return (
    <header className="h-16 border-b border-border bg-card px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="h-10 w-64 rounded-lg bg-secondary pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Switcher */}
        {user.roles.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <RoleIcon className="h-4 w-4" />
                <span className="capitalize hidden sm:inline">
                  {currentRole}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.roles.map((role) => {
                const Icon = roleIcons[role];
                return (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => switchRole(role)}
                    className="gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{role}</span>
                    {currentRole === role && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Active
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Single role badge */}
        {user.roles.length === 1 && (
          <Badge
            variant="outline"
            className={`gap-1.5 ${roleColors[currentRole]}`}
          >
            <RoleIcon className="h-3 w-3" />
            <span className="capitalize">{currentRole}</span>
          </Badge>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 group">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground group-hover:text-white">
                  {user.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setShowProfile(true)}
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Profile modal */}
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Profile</DialogTitle>
              <DialogDescription />
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground">Roles</p>
                <div className="flex gap-2 flex-wrap">
                  {user.roles.map((r) => (
                    <Badge
                      key={r}
                      variant="outline"
                      className={`capitalize ${roleColors[r]}`}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="w-full text-center text-sm text-muted-foreground">
                <p>
                  Status:{" "}
                  <span className="font-medium capitalize">{user.status}</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
};

export default Header;
