"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemList } from "@/components/inventory/item-list";
import { Pencil, Plus, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  number: number;
  description: string | null;
  imageUrl: string | null;
  size: string | null;
  allowsSizeFlexibility: boolean;
  active: boolean;
  category: { id: string; code: string; name: string };
  _count: { items: number };
}

interface Item {
  id: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
  isExternal: boolean;
  product: { id: string; name: string; number: number };
  category: { id: string; code: string; name: string };
  warehouseLocation: { id: string; label: string } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductDetailProps {
  product: Product;
  items: Item[];
  categories: { id: string; code: string; name: string }[];
  pagination: PaginationData;
}

export function ProductDetail({
  product,
  items,
  categories,
  pagination,
}: ProductDetailProps) {
  const productCode = `${product.category.code}-${String(product.number).padStart(3, "0")}`;

  return (
    <div className="space-y-6">
      {/* Product Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <span className="font-mono text-lg text-muted-foreground">
                  {productCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{product.category.name}</Badge>
                {!product.active && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
            <Link href={`/inventory/${product.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {product.imageUrl && (
              <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="space-y-3">
              {product.description && (
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}
              <div className="flex gap-6 text-sm">
                {product.size && (
                  <div>
                    <span className="font-medium">Size: </span>
                    <span className="text-muted-foreground">{product.size}</span>
                    {product.allowsSizeFlexibility && (
                      <span className="text-muted-foreground"> (flexible)</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{product._count.items}</span>
                  <span className="text-muted-foreground">
                    item{product._count.items !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Items
            <Badge variant="secondary">{pagination.total}</Badge>
          </h2>
          <Link href={`/inventory/${product.id}/items/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </div>
        <ItemList
          items={items}
          categories={categories}
          pagination={pagination}
          productId={product.id}
        />
      </div>
    </div>
  );
}
