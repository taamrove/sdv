"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, ChevronRight } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { permissions: number; users: number };
}

interface RoleListProps {
  roles: Role[];
}

export function RoleList({ roles }: RoleListProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {roles.length === 0 ? (
        <p className="text-muted-foreground col-span-full text-center py-8">
          No roles found
        </p>
      ) : (
        roles.map((role) => (
          <Card
            key={role.id}
            className="cursor-pointer transition-colors hover:border-primary/50"
            onClick={() => router.push(`/admin/roles/${role.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </CardTitle>
                  {role.description && (
                    <CardDescription>{role.description}</CardDescription>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  <span>
                    {role._count.permissions} permission
                    {role._count.permissions !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>
                    {role._count.users} user
                    {role._count.users !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
