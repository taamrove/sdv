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
import { Pencil, ShoppingBag } from "lucide-react";
import { ThemeFormDialog } from "./theme-form-dialog";
import Image from "next/image";

interface ProductTheme {
  productId: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
  };
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  products: ProductTheme[];
}

interface ThemeDetailProps {
  theme: Theme;
}

export function ThemeDetail({ theme }: ThemeDetailProps) {
  const [themeFormOpen, setThemeFormOpen] = useState(false);

  return (
    <>
      {/* Theme Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Theme Info</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeFormOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {theme.imageUrl && (
              <Image
                src={theme.imageUrl}
                alt={theme.name}
                width={160}
                height={160}
                className="rounded-lg border object-cover"
                style={{ width: 160, height: 160 }}
              />
            )}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{theme.name}</h2>
              {theme.description && (
                <p className="text-muted-foreground">{theme.description}</p>
              )}
              {!theme.active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products linked to this theme */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Products</h2>
        </div>

        {theme.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No products linked yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Link products (kits/sets) to this theme from the Products page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {theme.products.map((pt) => (
              <Card key={pt.productId}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{pt.product.name}</span>
                    {pt.product.description && (
                      <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {pt.product.description}
                      </span>
                    )}
                    {!pt.product.active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ThemeFormDialog
        open={themeFormOpen}
        onOpenChange={setThemeFormOpen}
        theme={theme}
      />
    </>
  );
}
