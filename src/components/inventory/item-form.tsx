"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  createItemSchema,
  type CreateItemInput,
} from "@/lib/validators/item";
import { createItem } from "@/actions/items";
import { ImageUpload } from "@/components/shared/image-upload";
import { ITEM_CONDITION_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  number: number;
  category: { id: string; code: string; name: string };
}

interface Location {
  id: string;
  label: string;
}

interface ItemFormProps {
  products: Product[];
  locations: Location[];
}

export function ItemForm({ products, locations }: ItemFormProps) {
  const router = useRouter();

  const form = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      productId: "",
      color: "",
      notes: "",
      condition: "NEW",
      isExternal: false,
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  async function onSubmit(data: CreateItemInput) {
    try {
      const result = await createItem(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Item created");
      router.push("/inventory");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <Select
                value={form.watch("productId")}
                onValueChange={(val) => form.setValue("productId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.category.code}-{String(p.number).padStart(3, "0")} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.productId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.productId.message}
                </p>
              )}
              {selectedProduct && (
                <p className="text-sm text-muted-foreground">
                  Category: {selectedProduct.category.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={form.watch("condition") ?? "NEW"}
                  onValueChange={(val) =>
                    form.setValue(
                      "condition",
                      val as CreateItemInput["condition"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_CONDITION_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="e.g., Red"
                  {...form.register("color")}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="isExternal"
                checked={form.watch("isExternal") ?? false}
                onCheckedChange={(checked) =>
                  form.setValue("isExternal", checked)
                }
              />
              <Label htmlFor="isExternal">External / Private Item</Label>
            </div>
            {form.watch("isExternal") && (
              <p className="text-xs text-muted-foreground">
                This item is externally owned. Warehouse location is optional.
              </p>
            )}
            {!form.watch("isExternal") && (
              <p className="text-xs text-muted-foreground">
                Company-owned item. A warehouse location is recommended.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="warehouseLocationId">
                Warehouse Location
                {form.watch("isExternal") ? " (optional)" : ""}
              </Label>
              <Select
                value={form.watch("warehouseLocationId") ?? "none"}
                onValueChange={(val) =>
                  form.setValue(
                    "warehouseLocationId",
                    val === "none" ? undefined : val
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-sm">Sizes (optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="size" className="text-xs">
                    General Size
                  </Label>
                  <Input
                    id="size"
                    placeholder="e.g., M, L, XL"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        size: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="chest" className="text-xs">
                    Chest
                  </Label>
                  <Input
                    id="chest"
                    placeholder="e.g., 90cm"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        chest: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="waist" className="text-xs">
                    Waist
                  </Label>
                  <Input
                    id="waist"
                    placeholder="e.g., 75cm"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        waist: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hip" className="text-xs">
                    Hip
                  </Label>
                  <Input
                    id="hip"
                    placeholder="e.g., 95cm"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        hip: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shoe" className="text-xs">
                    Shoe Size
                  </Label>
                  <Input
                    id="shoe"
                    placeholder="e.g., 42"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        shoe: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hat" className="text-xs">
                    Hat Size
                  </Label>
                  <Input
                    id="hat"
                    placeholder="e.g., 58"
                    onChange={(e) => {
                      const sizes = form.getValues("sizes") ?? {};
                      form.setValue("sizes", {
                        ...sizes,
                        hat: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  {...form.register("purchaseDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("purchasePrice", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Image</Label>
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url ?? undefined)}
                folder="items"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                {...form.register("notes")}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
