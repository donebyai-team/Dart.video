// import { useState } from "react";
import {
    X,
    PanelLeft,
    Video,
    Home,
    Palette
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@coasterai/ui-core/hooks/useAuth";

export function AppSidebar() {
    const { isMobile, toggleSidebar, openMobile } = useSidebar();
    const location = usePathname();
    const { currentOrganization } = useAuth();

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
        }
    ];


    return (
        <Sidebar>
            <SidebarHeader className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="flex items-center gap-2 px-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <Video className="w-4 h-4 text-primary-foreground" />
                        </div>
                    </Link>
                    <span className="font-semibold text-lg">CoasterAI</span>
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
            </SidebarHeader>
            <SidebarContent className="flex-grow">
                <SidebarGroup>
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainMenuItems.map((item) => (
                                <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton asChild isActive={item.active}>
                                        <Link href={item.path} className="flex items-center">
                                            <item.icon className="h-4 w-4 mr-2" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* ---------------- Footer ---------------- */}
            <SidebarFooter className="p-4 border-t border-border">
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
            </SidebarFooter>
        </Sidebar>
    );
}
