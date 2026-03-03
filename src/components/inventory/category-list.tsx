"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { CategoryFormDialog } from "./category-form-dialog";
import { SubCategoryFormDialog } from "./sub-category-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCategory } from "@/actions/categories";
import { deleteSubCategory } from "@/actions/sub-categories";
import { SIZE_MODE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SubCategory {
  id: string;
  name: string;
  sizeMode: string | null;
  order: number;
}

interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subCategories: SubCategory[];
  _count: { products: number; items: number };
}

interface CategoryListProps {
  categories: Category[];
}

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [subFormOpen, setSubFormOpen] = useState(false);
  const [subFormCategoryId, setSubFormCategoryId] = useState<string>("");
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [deletingSub, setDeletingSub] = useState<SubCategory | null>(null);
  const [subDeleteLoading, setSubDeleteLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const result = await deleteCategory(deleting.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Category deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  async function handleDeleteSub() {
    if (!deletingSub) return;
    setSubDeleteLoading(true);
    try {
      const result = await deleteSubCategory(deletingSub.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Sub-category deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete sub-category");
    } finally {
      setSubDeleteLoading(false);
      setDeletingSub(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const isExpanded = expandedCats.has(cat.id);
          return (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg font-mono">
                      {cat.code}
                    </Badge>
                    {cat.name}
                  </CardTitle>
                  {cat.description && (
                    <CardDescription className="mt-1">
                      {cat.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(cat); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(cat)}
                    disabled={cat._count.products > 0 || cat._count.items > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{cat._count.products} products</span>
                  <span>{cat._count.items} items</span>
                </div>

                <div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Sub-categories
                    {cat.subCategories.length > 0 && (
                      <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">{cat.subCategories.length}</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1">
                      {cat.subCategories.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-1">No sub-categories yet.</p>
                      ) : (
                        cat.subCategories.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{sub.name}</span>
                              {sub.sizeMode && (
                                <Badge variant="secondary" className="text-xs py-0 px-1">
                                  {SIZE_MODE_LABELS[sub.sizeMode] ?? sub.sizeMode}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5"
                                onClick={() => { setEditingSub(sub); setSubFormCategoryId(cat.id); setSubFormOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={() => setDeletingSub(sub)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-full text-xs justify-start px-2"
                        onClick={() => { setEditingSub(null); setSubFormCategoryId(cat.id); setSubFormOpen(true); }}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add sub-category
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />
      <SubCategoryFormDialog open={subFormOpen} onOpenChange={setSubFormOpen} categoryId={subFormCategoryId} subCategory={editingSub} />

      <ConfirmDialog
        open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} loading={deleteLoading}
      />
      <ConfirmDialog
        open={!!deletingSub} onOpenChange={(open) => !open && setDeletingSub(null)}
        title="Delete Sub-Category"
        description={`Are you sure you want to delete "${deletingSub?.name}"? Products using it will be unlinked.`}
        confirmLabel="Delete" variant="destructive" onConfirm={handleDeleteSub} loading={subDeleteLoading}
      />
    </>
  );
}
