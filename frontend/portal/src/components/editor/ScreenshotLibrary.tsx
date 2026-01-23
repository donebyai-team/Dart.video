// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Check, Search, Upload } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useVideoStore } from "@/stores/video";

// const screenshots = [
//   { id: "1", name: "Dashboard Overview", color: "from-primary/30 to-primary/10" },
//   { id: "2", name: "User Settings", color: "from-accent/30 to-accent/10" },
//   { id: "3", name: "Analytics View", color: "from-screen-feature/30 to-screen-feature/10" },
//   { id: "4", name: "Onboarding Flow", color: "from-screen-solution/30 to-screen-solution/10" },
//   { id: "5", name: "Pricing Page", color: "from-screen-proof/30 to-screen-proof/10" },
//   { id: "6", name: "Integration Setup", color: "from-screen-hook/30 to-screen-hook/10" },
// ];

// const ScreenshotLibrary = () => {
//   const [selected, setSelected] = useState<string | null>(null);
//   const [search, setSearch] = useState("");

//   const open = useVideoStore(s => s.showScreenshots);
//   const onOpenChange = useVideoStore(s => s.setShowScreenshots);


//   const filteredScreenshots = screenshots.filter((s) =>
//     s.name.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-3xl">
//         <DialogHeader>
//           <DialogTitle>Screenshot Library</DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4">
//           {/* Search and upload */}
//           <div className="flex gap-3">
//             <div className="relative flex-1">
//               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
//               <Input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search screenshots..."
//                 className="pl-10"
//               />
//             </div>
//             <Button variant="outline" className="gap-2">
//               <Upload className="w-4 h-4" />
//               Upload
//             </Button>
//           </div>

//           {/* Screenshot grid */}
//           <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
//             {filteredScreenshots.map((screenshot, index) => (
//               <motion.button
//                 key={screenshot.id}
//                 initial={{ opacity: 0, scale: 0.95 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 transition={{ delay: index * 0.05 }}
//                 onClick={() => setSelected(screenshot.id)}
//                 className={`relative aspect-video rounded-lg bg-gradient-to-br ${screenshot.color} overflow-hidden transition-all ${selected === screenshot.id
//                     ? "ring-2 ring-primary ring-offset-2"
//                     : "hover:ring-2 hover:ring-border"
//                   }`}
//               >
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <div className="w-8 h-8 bg-foreground/10 rounded-lg" />
//                 </div>
//                 {selected === screenshot.id && (
//                   <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
//                     <Check className="w-4 h-4 text-primary-foreground" />
//                   </div>
//                 )}
//                 <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-foreground/20 to-transparent">
//                   <p className="text-xs font-medium text-foreground truncate">
//                     {screenshot.name}
//                   </p>
//                 </div>
//               </motion.button>
//             ))}
//           </div>

//           {/* Actions */}
//           <div className="flex justify-end gap-3">
//             <Button variant="outline" onClick={() => onOpenChange(false)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={() => onOpenChange(false)}
//               disabled={!selected}
//               className="btn-primary-gradient"
//             >
//               Use screenshot
//             </Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default ScreenshotLibrary;
