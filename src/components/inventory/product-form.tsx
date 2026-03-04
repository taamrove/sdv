"use client";

import { useState, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createProductSchema,
  type CreateProductInput,
} from "@/lib/validators/product";
import { createProduct, updateProduct } from "@/actions/products";
import { ImageUpload } from "@/components/shared/image-upload";
import { CategoryFormDialog } from "@/components/inventory/category-form-dialog";
import { SubCategoryFormDialog } from "@/components/inventory/sub-category-form-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  code: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  sizeMode?: string | null;
}

interface ProductFormProps {
  categories: Category[];
  subCategories: SubCategory[];
  product?: {
    id: string;
    name: string;
    description: string | null;
    categoryId: string;
    subCategoryId: string | null;
    imageUrl: string | null;
    allowsSizeFlexibility: boolean;
  };
}

export function ProductForm({ categories, subCategories, product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;
  const closeAfterSave = useRef(false);

  const [localCategories, setLocalCategories] = useState(categories);
  const [localSubCategories, setLocalSubCategories] = useState(subCategories);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false);

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      categoryId: product?.categoryId ?? "",
      subCategoryId: product?.subCategoryId ?? undefined,
      name: product?.name ?? "",
      description: product?.description ?? "",
      imageUrl: product?.imageUrl ?? undefined,
      allowsSizeFlexibility: product?.allowsSizeFlexibility ?? true,
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const filteredSubCategories = localSubCategories.filter(
    (s) => s.categoryId === (isEditing ? product.categoryId : selectedCategoryId)
  );

  // Show subcategory section once a category is chosen (creation) or always (editing)
  const showSubCategory = isEditing || !!selectedCategoryId;

  async function onSubmit(data: CreateProductInput) {
    try {
      if (isEditing) {
        const result = await updateProduct(product.id, {
          subCategoryId: data.subCategoryId,
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          allowsSizeFlexibility: data.allowsSizeFlexibility,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Product updated");
        router.push(`/inventory/${product.id}`);
      } else {
        const result = await createProduct(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Product created");
        if (closeAfterSave.current) {
          const created = result.data as { id: string };
          router.push(`/inventory/${created.id}`);
        } else {
          form.reset({
            categoryId: "",
            subCategoryId: undefined,
            name: "",
            description: "",
            imageUrl: undefined,
            allowsSizeFlexibility: true,
          });
        }
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Product" : "Create Product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Category (creation only) */}
            {!isEditing && (
              <div className="space-y-1">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={form.watch("categoryId")}
                  onValueChange={(val) => {
                    if (val === "__new_category__") {
                      setCategoryDialogOpen(true);
                      return;
                    }
                    form.setValue("categoryId", val);
                    form.setValue("subCategoryId", undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {localCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code} – {cat.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="__new_category__">
                      <Plus className="mr-1 h-3 w-3 inline-block" />
                      New category
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.categoryId.message}
                  </p>
                )}
              </div>
            )}

            {/* SubCategory */}
            {showSubCategory && (
              <div className="space-y-1">
                <Label htmlFor="subCategoryId">Type</Label>
                <Select
                  value={form.watch("subCategoryId") ?? "none"}
                  onValueChange={(val) => {
                    if (val === "__new_sub__") {
                      setSubCategoryDialogOpen(true);
                      return;
                    }
                    form.setValue("subCategoryId", val === "none" ? undefined : val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No type</SelectItem>
                    {filteredSubCategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="__new_sub__">
                      <Plus className="mr-1 h-3 w-3 inline-block" />
                      New type
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sub-type within the category (e.g. Jacket, Boots).
                </p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="e.g., Red Carnival Dress"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                {...form.register("description")}
              />
            </div>

            {/* Flexible sizing */}
            <div className="flex items-center gap-3">
              <Switch
                id="allowsSizeFlexibility"
                checked={form.watch("allowsSizeFlexibility") ?? true}
                onCheckedChange={(checked) =>
                  form.setValue("allowsSizeFlexibility", checked)
                }
              />
              <div>
                <Label htmlFor="allowsSizeFlexibility">Flexible sizing</Label>
                <p className="text-xs text-muted-foreground">
                  Items of this product can fit performers outside their exact size.
                </p>
              </div>
            </div>

            {/* Image */}
            <div className="space-y-1">
              <Label>Product Image</Label>
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url ?? undefined)}
                folder="products"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              {isEditing ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Update"}
                </Button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSuccess={(cat) => {
          setLocalCategories((prev) => [...prev, cat]);
          form.setValue("categoryId", cat.id);
          form.setValue("subCategoryId", undefined);
        }}
      />

      <SubCategoryFormDialog
        open={subCategoryDialogOpen}
        onOpenChange={setSubCategoryDialogOpen}
        categoryId={selectedCategoryId}
        onSuccess={(sub) => {
          setLocalSubCategories((prev) => [
            ...prev,
            { ...sub, categoryId: selectedCategoryId },
          ]);
          form.setValue("subCategoryId", sub.id);
        }}
      />
    </>
  );
}
