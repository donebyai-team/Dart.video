import { PortalAuthProvider } from "@/provider/PortalAuthProvider";
import type { ReactNode } from "react";

export default function RootLayout({children,}: {children: ReactNode;}) {
  return <PortalAuthProvider>{children}</PortalAuthProvider>;
}
