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
  SelectSeparator,
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
import { createItem, createItems } from "@/actions/items";
import { LocationFormDialog } from "@/components/warehouse/location-form-dialog";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  ITEM_CONDITION_LABELS,
  CLOTHING_SIZES,
  SHOE_SIZES_EU,
  HAT_SIZES_CM,
} from "@/lib/constants";
import { getFullName } from "@/lib/format-name";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Plus } from "lucide-react";
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

interface Performer {
  id: string;
  firstName: string;
  lastName: string;
}

interface ItemFormProps {
  products: Product[];
  locations: Location[];
  /** When set, pre-selects and locks the product dropdown */
  defaultProductId?: string;
  /** sizeMode from the product's sub-category — drives which size fields appear */
  sizeMode?: string | null;
  /** Performers for main performer assignment */
  performers?: Performer[];
}

export function ItemForm({
  products,
  locations: locationsProp,
  defaultProductId,
  sizeMode,
  performers = [],
}: ItemFormProps) {
  const router = useRouter();
  const closeAfterSave = useRef(false);
  const [quantity, setQuantity] = useState(1);
  const [locations, setLocations] = useState(locationsProp);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const form = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      productId: defaultProductId ?? "",
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
      if (quantity > 1) {
        const result = await createItems(data, quantity);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.data.count} items created`);
      } else {
        const result = await createItem(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Item created");
      }
      if (closeAfterSave.current) {
        router.push(defaultProductId ? `/inventory/${defaultProductId}` : "/inventory");
      } else {
        form.reset({
          productId: defaultProductId ?? "",
          color: "",
          notes: "",
          condition: "NEW",
          isExternal: false,
        });
        setQuantity(1);
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  /** Render the size inputs appropriate for sizeMode */
  function renderSizeFields() {
    if (sizeMode === "clothing") {
      return (
        <div className="space-y-1">
          <Label htmlFor="size" className="text-xs">Clothing Size</Label>
          <Select
            onValueChange={(val) => {
              const sizes = form.getValues("sizes") ?? {};
              form.setValue("sizes", { ...sizes, size: val });
            }}
          >
            <SelectTrigger id="size">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {CLOTHING_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (sizeMode === "shoes") {
      return (
        <div className="space-y-1">
          <Label htmlFor="shoe" className="text-xs">Shoe Size (EU)</Label>
          <Select
            onValueChange={(val) => {
              const sizes = form.getValues("sizes") ?? {};
              form.setValue("sizes", { ...sizes, shoe: val });
            }}
          >
            <SelectTrigger id="shoe">
              <SelectValue placeholder="Select EU size" />
            </SelectTrigger>
            <SelectContent>
              {SHOE_SIZES_EU.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (sizeMode === "hat") {
      return (
        <div className="space-y-1">
          <Label htmlFor="hat" className="text-xs">Hat Size (cm)</Label>
          <Select
            onValueChange={(val) => {
              const sizes = form.getValues("sizes") ?? {};
              form.setValue("sizes", { ...sizes, hat: val });
            }}
          >
            <SelectTrigger id="hat">
              <SelectValue placeholder="Select hat size" />
            </SelectTrigger>
            <SelectContent>
              {HAT_SIZES_CM.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (sizeMode === "measurements") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: "chest", label: "Chest", placeholder: "e.g., 90cm" },
            { key: "waist", label: "Waist", placeholder: "e.g., 75cm" },
            { key: "hip", label: "Hip", placeholder: "e.g., 95cm" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="text-xs">{label}</Label>
              <Input
                id={key}
                placeholder={placeholder}
                onChange={(e) => {
                  const sizes = form.getValues("sizes") ?? {};
                  form.setValue("sizes", { ...sizes, [key]: e.target.value });
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    // No sizeMode — show all fields as free text
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { key: "size", label: "General Size", placeholder: "e.g., M, L, XL" },
          { key: "chest", label: "Chest", placeholder: "e.g., 90cm" },
          { key: "waist", label: "Waist", placeholder: "e.g., 75cm" },
          { key: "hip", label: "Hip", placeholder: "e.g., 95cm" },
          { key: "shoe", label: "Shoe Size", placeholder: "e.g., 42" },
          { key: "hat", label: "Hat Size", placeholder: "e.g., 58" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="text-xs">{label}</Label>
            <Input
              id={key}
              placeholder={placeholder}
              onChange={(e) => {
                const sizes = form.getValues("sizes") ?? {};
                form.setValue("sizes", { ...sizes, [key]: e.target.value });
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="productId">Product *</Label>
              <Select
                value={form.watch("productId")}
                onValueChange={(val) => form.setValue("productId", val)}
                disabled={!!defaultProductId}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
                {quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Creates {quantity} identical items.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
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

              <div className="space-y-1">
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

            <div className="space-y-1">
              <Label htmlFor="warehouseLocationId">
                Warehouse Location
                {form.watch("isExternal") ? " (optional)" : ""}
              </Label>
              <Select
                value={form.watch("warehouseLocationId") ?? "none"}
                onValueChange={(val) => {
                  if (val === "__new_location__") {
                    setLocationDialogOpen(true);
                    return;
                  }
                  form.setValue(
                    "warehouseLocationId",
                    val === "none" ? undefined : val
                  );
                }}
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
                  <SelectSeparator />
                  <SelectItem value="__new_location__">
                    <Plus className="mr-1 h-3 w-3 inline-block" /> New location
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!form.watch("isExternal") && !form.watch("warehouseLocationId") && (
              <Alert variant="default" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription>
                  Company-owned items should have a warehouse location assigned. Add a location so this item can be found in the warehouse.
                </AlertDescription>
              </Alert>
            )}

            {/* Size fields driven by sizeMode */}
            {renderSizeFields()}

            {/* Main performer */}
            <div className="space-y-1">
              <Label htmlFor="mainPerformerId">Main Performer (optional)</Label>
              <Select
                value={form.watch("mainPerformerId") ?? "none"}
                onValueChange={(val) =>
                  form.setValue("mainPerformerId", val === "none" ? undefined : val)
                }
                disabled={performers.length === 0}
              >
                <SelectTrigger id="mainPerformerId">
                  <SelectValue placeholder={performers.length === 0 ? "No performers added yet" : "No performer assigned"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No performer assigned</SelectItem>
                  {performers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {getFullName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {performers.length === 0 && (
                <p className="text-xs text-muted-foreground">Add performers in the Performers section first.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  {...form.register("purchaseDate")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("purchasePrice", {
                    setValueAs: (v) => {
                      if (v === "" || v === null || v === undefined) return undefined;
                      const n = Number(v);
                      return isNaN(n) ? undefined : n;
                    },
                  })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Item Image</Label>
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url ?? undefined)}
                folder="items"
              />
            </div>

            <div className="space-y-1">
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
              <Button
                type="submit"
                variant="secondary"
                disabled={form.formState.isSubmitting}
                onClick={() => { closeAfterSave.current = false; }}
              >
                {form.formState.isSubmitting ? "Creating..." : "Add"}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                onClick={() => { closeAfterSave.current = true; }}
              >
                {form.formState.isSubmitting ? "Creating..." : "Add & Close"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <LocationFormDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        onSuccess={(loc) => {
          setLocations((prev) => [...prev, loc]);
          form.setValue("warehouseLocationId", loc.id);
        }}
      />
    </div>
  );
}
