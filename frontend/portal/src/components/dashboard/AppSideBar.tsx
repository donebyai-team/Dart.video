"use client";

// import { useState } from "react";
import {
    Video,
    Home,
    Palette,
    Wand2,
    CreditCard,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@coasterai/ui-core/hooks/useAuth";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { isPlatformAdmin } from "@coasterai/ui-core/helper/role";

export function AppSidebar() {
    // const { isMobile, toggleSidebar, openMobile } = useSidebar();
    const location = usePathname();
    const { currentOrganization, user } = useAuth();

    const isActive = (path: string) => {
        return location?.startsWith(path);
    };

    const mainMenuItems = [
        {
            title: "Home",
            icon: Home,
            path: "/dashboard",
            active: location === "/dashboard",
        },
        {
            title: "Recent Videos",
            icon: Video,
            path: "/dashboard/videos",
            active: isActive("/dashboard/videos"),
        },
        {
            title: "Brand Identity",
            icon: Palette,
            path: "/dashboard/brand",
            active: isActive("/dashboard/brand"),
        },
         {
            title: "Billing",
            icon: CreditCard,
            path: "/dashboard/billing",
            active: isActive("/dashboard/billing"),
        }
    ];

    if (user && isPlatformAdmin(user)) {
        mainMenuItems.push({
            title: "Animations",
            icon: Wand2,
            path: "/dashboard/templates",
            active: isActive("/dashboard/templates"),
        })
    }


    return (
        <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-background">
            <div className="border-b border-border p-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="flex items-center gap-2 px-2">
                        <span className="text-lg font-semibold text-gray-900">
                            dart<span className="text-gray-500">.video</span>
                        </span>
                    </Link>

                    {/* <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={toggleSidebar}
  >
    {isMobile && openMobile ? (
      <X className="h-4 w-4" />
    ) : (
      <PanelLeft className="h-4 w-4" />
    )}
  </Button> */}
                </div>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
                <div className="px-3 py-3">                    
                    <nav className="space-y-0">
                            {mainMenuItems.map((item) => (
                                <div key={item.path}>
                                        <Link
                                            href={item.path}
                                            className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${item.active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                                        >
                                            <item.icon className="h-4 w-4 mr-2" />
                                            <span>{item.title}</span>
                                        </Link>
                                </div>
                            ))}
                    </nav>
                </div>
            </div>

            {/* ---------------- Footer ---------------- */}
            <div className="border-t border-border p-4">
                <WorkspaceSwitcher />
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-sm font-medium"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {currentOrganization?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            Pro Plan
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
