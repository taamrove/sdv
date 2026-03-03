"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  number: number;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  category: { id: string; code: string; name: string };
  subCategory: { id: string; name: string } | null;
  _count: { items: number };
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductListProps {
  products: Product[];
  categories: Category[];
  pagination: PaginationData;
}

const columns: ColumnDef<Product>[] = [
  {
    id: "image",
    header: "",
    cell: ({ row }) =>
      row.original.imageUrl ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border">
          <Image
            src={row.original.imageUrl}
            alt={row.original.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
      ),
  },
  {
    accessorKey: "number",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.category.code}-{String(row.original.number).padStart(3, "0")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.name}</span>
          {!row.original.active && (
            <Badge variant="destructive" className="text-xs">Inactive</Badge>
          )}
        </div>
        {row.original.subCategory && (
          <div className="text-xs text-muted-foreground">{row.original.subCategory.name}</div>
        )}
        {!row.original.subCategory && row.original.description && (
          <div className="text-xs text-muted-foreground truncate max-w-[280px]">
            {row.original.description}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category.name}</Badge>
    ),
  },
  {
    accessorKey: "_count.items",
    header: "Items",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <Package className="h-3 w-3 text-muted-foreground" />
        {row.original._count.items}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/inventory/${row.original.id}`}>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

export function ProductList({ products, categories, pagination }: ProductListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters({ search });
          }}
          className="max-w-sm"
        />
        <Select
          value={searchParams.get("categoryId") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ categoryId: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.code} - {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={products}
        onRowClick={(product) => router.push(`/inventory/${product.id}`)}
      />
      <Pagination {...pagination} />
    </div>
  );
}
