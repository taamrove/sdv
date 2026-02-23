"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "@/actions/admin";
import { getFullName } from "@/lib/format-name";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  active: boolean;
  role: { id: string; name: string };
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  roles: Role[];
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
}: UserFormDialogProps) {
  const router = useRouter();
  const isEditing = !!user;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email);
        setPhone(user.phone ?? "");
        setPassword("");
        setRoleId(user.role.id);
        setActive(user.active);
      } else {
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setRoleId(roles[0]?.id ?? "");
        setActive(true);
      }
    }
  }, [open, user, roles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const displayName = getFullName({ firstName, lastName });

    try {
      if (isEditing) {
        const data: Record<string, unknown> = {
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          roleId,
          active,
        };
        if (password) {
          data.password = password;
        }
        const result = await updateUser(user.id, data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`User "${displayName}" updated successfully`);
      } else {
        if (!password) {
          toast.error("Password is required for new users");
          return;
        }
        const result = await createUser({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          password,
          roleId,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`User "${displayName}" created successfully`);
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the user account details below."
                : "Fill in the details to create a new user account."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user-firstName">First Name</Label>
                <Input
                  id="user-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-lastName">Last Name</Label>
                <Input
                  id="user-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-phone">Phone</Label>
              <Input
                id="user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+41 79 123 45 67"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password{isEditing ? " (leave blank to keep current)" : ""}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? "Unchanged" : "Min. 8 characters"}
                required={!isEditing}
                minLength={password ? 8 : undefined}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="flex items-center gap-3">
                <Switch
                  id="user-active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="user-active">Active</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
