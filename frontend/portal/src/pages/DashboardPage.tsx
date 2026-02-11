import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Settings,
  Users,
  Palette,
  Fingerprint,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Video,
  Image as ImageIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import VideoIntentComposer from "@/components/dashboard/VideoIntentComposer";
import RecentVideos from "@/components/dashboard/RecentVideos";
import { useOrganization } from "@coasterai/ui-core/hooks/useOrganization";

/* ---------------- Existing Dashboard Code ---------------- */

type NavItem = {
  title: string;
  icon: React.ElementType;
  id: string;
  children?: { title: string; icon: React.ElementType; id: string }[];
};

const navItems: NavItem[] = [
  { title: "Home", icon: Home, id: "home" },
  { title: "Recent Videos", icon: Video, id: "recent-videos" }, // NEW
  {
    title: "Brand",
    icon: Palette,
    id: "brand",
    children: [
      { title: "Brand Identity", icon: Fingerprint, id: "brand-identity" },
      { title: "Personas", icon: UserCircle, id: "personas" },
    ],
  },
  { title: "Settings", icon: Settings, id: "settings" },
  { title: "Team", icon: Users, id: "team" },
];


const DashboardPage = () => {
  const [activeNav, setActiveNav] = useState("home");
  const [brandExpanded, setBrandExpanded] = useState(false);
  const [currentOrg] = useOrganization();


  const handleNavClick = (id: string) => {
    setActiveNav(id);
    if (id.startsWith("brand")) setBrandExpanded(true);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Video className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">CoasterAI</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            <SidebarGroup>            
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) =>
                    item.children ? (
                      <Collapsible
                        key={item.id}
                        open={brandExpanded}
                        onOpenChange={setBrandExpanded}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="rounded-lg">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                              {brandExpanded ? (
                                <ChevronDown className="ml-auto w-4 h-4" />
                              ) : (
                                <ChevronRight className="ml-auto w-4 h-4" />
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.id}>
                                  <SidebarMenuSubButton
                                    onClick={() => handleNavClick(child.id)}
                                    isActive={activeNav === child.id}
                                  >
                                    <child.icon className="w-4 h-4" />
                                    <span>{child.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ) : (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => handleNavClick(item.id)}
                          isActive={activeNav === item.id}
                          className="rounded-lg"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium"></span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentOrg?.name}</p>
                <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >           
            {activeNav === "home" && (
              <>
                <VideoIntentComposer />
              </>
            )}

            {activeNav === "recent-videos" && <RecentVideos />}

          </motion.div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
