"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Palette, ShoppingBag } from "lucide-react";
import { ThemeFormDialog } from "./theme-form-dialog";
import Link from "next/link";

interface Theme {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  _count: { kits: number };
}

interface ThemeListProps {
  themes: Theme[];
}

export function ThemeList({ themes }: ThemeListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Theme | null>(null);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Theme
        </Button>
      </div>

      {themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Palette className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No themes yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create themes to organize products (kits/sets) for your productions.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {themes.map((theme) => (
            <Card key={theme.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  <Link
                    href={`/themes/${theme.id}`}
                    className="hover:underline"
                  >
                    {theme.name}
                  </Link>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditing(theme); setFormOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {theme.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {theme.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />
                    {theme._count.kits} kit{theme._count.kits !== 1 ? "s" : ""}
                  </div>
                </div>
                {!theme.active && (
                  <Badge variant="secondary" className="mt-2">
                    Inactive
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ThemeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        theme={editing}
      />
    </>
  );
}
