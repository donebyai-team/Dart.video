
import { useState } from "react";
import {
  ChevronDown,
  // Plus, 
  // Settings 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
// import Link from "next/link";
import { useAuth } from "@coasterai/ui-core/hooks/useAuth";
import { isPlatformAdmin } from "@coasterai/ui-core/helper/role";
import { useOrganization } from "@coasterai/ui-core/hooks/useOrganization";
import { Organization } from "@coasterai/pb/coasterai/portal/v1/portal_pb";

interface Workspace {
  id: string;
  name: string;
}

export function WorkspaceSwitcher() {

  const { user } = useAuth()
  const [currentOrg, setCurrentOrganization] = useOrganization();

  const canChangeOrg = user && isPlatformAdmin(user);
  const workspaces: Organization[] = user?.organizations ?? [];
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(workspaces[0]);

  return (<>
 
    

    {user && isPlatformAdmin(user) && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-1 px-2 ml-2">
            <span className="text-sm font-medium max-w-[150px] truncate">
              {currentOrg?.name}
            </span>
            {canChangeOrg && (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
          {[...user.organizations]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => {
                  setCurrentOrganization(workspace).then(() => {
                    window.location.reload();
                  });
                }}
                className="cursor-pointer flex items-center justify-between"
              >
                <span className="truncate">{workspace?.name}</span>
                {currentOrg?.id === workspace.id && (
                  <span className="w-2 h-2 rounded-full bg-primary ml-2"></span>
                )}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>

      </DropdownMenu>
    )}
  </>);
}
