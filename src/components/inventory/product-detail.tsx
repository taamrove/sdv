"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemList } from "@/components/inventory/item-list";
import { Pencil, Plus, Package, Layers, PowerOff, Power, Trash2 } from "lucide-react";
import { updateProduct, deleteProduct } from "@/actions/products";
import { CompactActivityLog, type ActivityEntry } from "@/components/dashboard/activity-log";

interface SubCategory {
  id: string;
  name: string;
  sizeMode: string | null;
}

interface Product {
  id: string;
  name: string;
  number: number;
  description: string | null;
  imageUrl: string | null;
  allowsSizeFlexibility: boolean;
  active: boolean;
  category: { id: string; code: string; name: string };
  subCategory: SubCategory | null;
  _count: { items: number };
}

interface Item {
  id: string;
  humanReadableId: string;
  status: string;
  condition: string;
  color: string | null;
  isExternal: boolean;
  archived: boolean;
  product: { id: string; name: string; number: number; imageUrl: string | null };
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
  recentActivity: ActivityEntry[];
  locationLabels: Record<string, string>;
  pagination: PaginationData;
}

export function ProductDetail({
  product,
  items,
  categories,
  recentActivity,
  locationLabels,
  pagination,
}: ProductDetailProps) {
  const router = useRouter();
  const [active, setActive] = useState(product.active);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const productCode = `${product.category.code}-${String(product.number).padStart(3, "0")}`;

  async function handleToggleActive() {
    setToggling(true);
    try {
      const result = await updateProduct(product.id, { active: !active });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setActive(!active);
        toast.success(active ? "Product disabled" : "Product enabled");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const result = await deleteProduct(product.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Product deleted");
        router.push("/inventory");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{product.category.name}</Badge>
                {product.subCategory && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {product.subCategory.name}
                  </Badge>
                )}
                {!active && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
                {product.allowsSizeFlexibility && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Flexible sizing
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={toggling}
              >
                {active ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    {toggling ? "Disabling…" : "Disable"}
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    {toggling ? "Enabling…" : "Enable"}
                  </>
                )}
              </Button>
              <Link href={`/inventory/${product.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
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
              <div className="flex items-center gap-1 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{product._count.items}</span>
                <span className="text-muted-foreground">
                  item{product._count.items !== 1 ? "s" : ""}
                </span>
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

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CompactActivityLog
              entries={recentActivity}
              locationLabels={locationLabels}
              defaultVisible={5}
            />
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {product._count.items === 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete this product</p>
                <p className="text-xs text-muted-foreground">
                  Permanently remove the product. Only possible when it has no items.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? "Deleting…" : "Delete Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
