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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createProductSchema,
  type CreateProductInput,
} from "@/lib/validators/product";
import { createProduct, updateProduct } from "@/actions/products";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  code: string;
  name: string;
}

interface ProductFormProps {
  categories: Category[];
  product?: {
    id: string;
    name: string;
    description: string | null;
    categoryId: string;
    imageUrl: string | null;
    size: string | null;
    allowsSizeFlexibility: boolean;
  };
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      categoryId: product?.categoryId ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      imageUrl: product?.imageUrl ?? undefined,
      size: product?.size ?? undefined,
      allowsSizeFlexibility: product?.allowsSizeFlexibility ?? true,
    },
  });

  async function onSubmit(data: CreateProductInput) {
    try {
      if (isEditing) {
        const result = await updateProduct(product.id, {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          size: data.size,
          allowsSizeFlexibility: data.allowsSizeFlexibility,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Product updated");
      } else {
        const result = await createProduct(data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Product created");
      }
      router.push("/inventory/products");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Product" : "Create Product"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.watch("categoryId")}
                onValueChange={(val) => form.setValue("categoryId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.categoryId.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              placeholder="e.g., Red Carnival Dress"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                placeholder="e.g., S, M, L, 38"
                {...form.register("size")}
              />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch
                id="allowsSizeFlexibility"
                checked={form.watch("allowsSizeFlexibility") ?? true}
                onCheckedChange={(checked) =>
                  form.setValue("allowsSizeFlexibility", checked)
                }
              />
              <Label htmlFor="allowsSizeFlexibility">
                Allows size flexibility
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <ImageUpload
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url ?? undefined)}
              folder="products"
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
              {form.formState.isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
