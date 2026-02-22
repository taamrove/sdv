"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getFeatureFlagById,
  addBetaUser,
  removeBetaUser,
  searchUsersForBetaFlag,
} from "@/actions/feature-flags";
import { X, ChevronsUpDown, UserPlus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BetaUser {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  stage: "ALPHA" | "BETA" | "PRODUCTION";
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
}

interface FeatureFlagBetaUsersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FeatureFlag | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureFlagBetaUsers({
  open,
  onOpenChange,
  flag,
}: FeatureFlagBetaUsersProps) {
  const router = useRouter();
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // User search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const loadBetaUsers = useCallback(async () => {
    if (!flag) return;
    setLoading(true);
    try {
      const result = await getFeatureFlagById(flag.id);
      if ("data" in result) {
        const data = result.data as {
          betaUsers: BetaUser[];
        };
        setBetaUsers(data.betaUsers);
      }
    } catch {
      toast.error("Failed to load beta users");
    } finally {
      setLoading(false);
    }
  }, [flag]);

  useEffect(() => {
    if (open && flag) {
      loadBetaUsers();
    }
    if (!open) {
      setBetaUsers([]);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, flag, loadBetaUsers]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchUsersForBetaFlag(searchQuery);
        if ("data" in result) {
          // Filter out users already in beta
          const existingIds = new Set(betaUsers.map((bu) => bu.userId));
          setSearchResults(
            result.data.filter((u) => !existingIds.has(u.id))
          );
        }
      } catch {
        // Silently fail on search
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, betaUsers]);

  async function handleAdd(userId: string) {
    if (!flag) return;
    setAdding(true);
    try {
      const result = await addBetaUser(flag.id, userId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Beta user added");
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        await loadBetaUsers();
        router.refresh();
      }
    } catch {
      toast.error("Failed to add beta user");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!flag) return;
    setRemoving(userId);
    try {
      const result = await removeBetaUser(flag.id, userId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Beta user removed");
        setBetaUsers((prev) => prev.filter((bu) => bu.userId !== userId));
        router.refresh();
      }
    } catch {
      toast.error("Failed to remove beta user");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Beta Users</DialogTitle>
          <DialogDescription>
            Manage beta access for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono">
              {flag?.key}
            </code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add user */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={adding}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add beta user...
                <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {searching
                      ? "Searching..."
                      : searchQuery.length < 2
                        ? "Type at least 2 characters..."
                        : "No users found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {searchResults.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleAdd(user.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Current beta users */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading...
              </p>
            ) : betaUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No beta users yet
              </p>
            ) : (
              betaUsers.map((bu) => (
                <div
                  key={bu.userId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {bu.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {bu.user.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(bu.userId)}
                    disabled={removing === bu.userId}
                    title="Remove beta user"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
