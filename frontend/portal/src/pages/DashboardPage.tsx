import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Plus,
  Settings,
  Users,
  Play,
  MoreHorizontal,
  Clock,
  FileText,
  Upload,
  Search,
  Palette,
  Fingerprint,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { Video as VideoConfig } from "@coasterai/pb/coasterai/core/v1/video_pb";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";

type NavItem = {
  title: string;
  icon: React.ElementType;
  id: string;
  children?: { title: string; icon: React.ElementType; id: string }[];
};

const navItems: NavItem[] = [
  { title: "Home", icon: Home, id: "home" },
  {
    title: "Brand",
    icon: Palette,
    id: "brand",
    children: [
      { title: "Brand Identity", icon: Fingerprint, id: "brand-identity" },
      { title: "Personas", icon: UserCircle, id: "personas" },
    ]
  },
  { title: "Settings", icon: Settings, id: "settings" },
  { title: "Team", icon: Users, id: "team" },
];



const DashboardPage = () => {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("home");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<"choose" | "name">("choose");
  const [selectedOption, setSelectedOption] = useState<"script" | "upload" | null>(null);
  const [videoName, setVideoName] = useState("");
  const [brandExpanded, setBrandExpanded] = useState(false);
  const [brandUrl, setBrandUrl] = useState("");
  const [videos, setVideos] = useState<VideoConfig[]>([]);
  const { portalClient } = useClientsContext()

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await portalClient.getVideos({});
        setVideos(res.videos);
      } catch (err) {
        console.error("Failed to fetch videos", err);
        toast.error(getConnectError(err))
      }
    };

    if (portalClient) {
      fetchVideos();
    }
  }, [portalClient]);


  const handleNavClick = (id: string) => {
    setActiveNav(id);
    if (id.startsWith("brand")) {
      setBrandExpanded(true);
    }
  };

  const handleCreateOption = (option: "script" | "upload") => {
    setSelectedOption(option);
    setCreateStep("name");
  };

  const handleCreateVideo = () => {
    if (!videoName.trim()) return;
    setShowCreateModal(false);
    setCreateStep("choose");
    const name = videoName.trim();
    const type = selectedOption;
    setVideoName("");
    setSelectedOption(null);

    if (type === "script") {
      // Navigate to script input page for script-based creation
      router.push("/script");
    } else {
      // Navigate directly to editor for upload-based creation
      // In a real app, you'd create a new video and get its ID
      router.push("/editor/new");
    }
  };

  const handleModalClose = (open: boolean) => {
    setShowCreateModal(open);
    if (!open) {
      setCreateStep("choose");
      setVideoName("");
      setSelectedOption(null);
    }
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
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
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
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>


        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {activeNav === "brand-identity" ? (
            <div className="h-full flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-3">Analyze Personal Brand Identity</h1>
                <p className="text-muted-foreground mb-8">
                  CoasterAI scans your site to capture your logo, tone, and aesthetic — so you can apply your brand identity to every image and video automatically.
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Analyze url"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button className="btn-accent-gradient">
                    Analyze brand
                  </Button>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold">Welcome back, John</h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your videos and create new content
                  </p>
                </div>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-accent-gradient gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Video
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">Total Videos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">3</p>
                        <p className="text-sm text-muted-foreground">Drafts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-screen-solution/10 flex items-center justify-center">
                        <Play className="w-6 h-6 text-screen-solution" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">9</p>
                        <p className="text-sm text-muted-foreground">Published</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Videos */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <motion.div
                      key={video.id}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className="card-elevated overflow-hidden cursor-pointer group"
                        onClick={() => router.push(`/editor/${video.id}`)}
                      >
                        <div className="relative aspect-video">
                          <img
                            src={"https://placehold.co/600x400.png"}
                            alt={video.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-foreground ml-0.5" />
                            </div>
                          </div>
                          {/* <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                            {2}
                          </div> */}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate">{video.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {/* <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    video.status === "published"
                                      ? "bg-screen-solution/10 text-screen-solution"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {video.status === "published" ? "Published" : "Draft"}
                                </span> */}
                                {/* <span className="text-xs text-muted-foreground">
                                  {video.createdAt}
                                </span> */}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* Create New Video Modal */}
        <Dialog open={showCreateModal} onOpenChange={handleModalClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {createStep === "choose" ? "Create New Video" : "Name Your Video"}
              </DialogTitle>
              {createStep === "name" && (
                <DialogDescription>
                  Give your video a name to get started
                </DialogDescription>
              )}
            </DialogHeader>

            {createStep === "choose" ? (
              <div className="grid gap-4 py-4">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => handleCreateOption("script")}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Start with a Script</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Write or paste your script and let AI generate visuals
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => handleCreateOption("upload")}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Upload className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Upload a Walkthrough</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Transform an existing video into a polished explainer
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-name">Video Name</Label>
                  <Input
                    id="video-name"
                    placeholder="e.g., Product Launch Explainer"
                    value={videoName}
                    onChange={(e) => setVideoName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateVideo()}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCreateStep("choose")}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 btn-accent-gradient"
                    onClick={handleCreateVideo}
                    disabled={!videoName.trim()}
                  >
                    Create Video
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default DashboardPage;
