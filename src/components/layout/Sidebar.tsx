import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Dumbbell,
  Users,
  ClipboardList,
  BookOpen,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  Menu,
  Library,
} from "lucide-react";
import lpLogo from "@/assets/lp-logo.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Sidebar() {
  const location = useLocation();
  const { isAdmin, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const adminLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/students", label: "Alunos", icon: Users },
    { href: "/library", label: "Biblioteca", icon: Library },
    { href: "/guides", label: "Guias", icon: BookOpen },
  ];

  const studentLinks = [
    { href: "/", label: "Meus Treinos", icon: Dumbbell },
    { href: "/logbook", label: "Logbook", icon: ClipboardList },
    { href: "/guides", label: "Guias", icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <img src={lpLogo} alt="LP Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sidebar-accent-foreground truncate">
                Sistema LP
              </h1>
              <p className="text-xs text-sidebar-foreground truncate">
                {isAdmin ? "Admin" : "Aluno"}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "nav-link",
                isActive && "nav-link-active",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground mb-3 truncate">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-lg"
      >
        <Menu className="w-5 h-5 text-sidebar-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 fixed inset-y-0 left-0 z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-sidebar-primary rounded-full flex items-center justify-center text-sidebar-primary-foreground"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Spacer for main content */}
      <div
        className={cn(
          "hidden lg:block flex-shrink-0 transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      />
    </>
  );
}
