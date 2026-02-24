"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ITEM_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
} from "@/lib/constants";

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

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: "humanReadableId",
    header: "ID",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-medium">
          {row.original.humanReadableId}
        </span>
        {row.original.isExternal && (
          <Badge variant="secondary" className="text-xs">
            External
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "product.name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.product.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.category.name}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        label={ITEM_STATUS_LABELS[row.original.status]}
      />
    ),
  },
  {
    accessorKey: "condition",
    header: "Condition",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.condition}
        label={ITEM_CONDITION_LABELS[row.original.condition]}
      />
    ),
  },
  {
    accessorKey: "warehouseLocation",
    header: "Location",
    cell: ({ row }) =>
      row.original.warehouseLocation ? (
        <Badge variant="outline" className="gap-1">
          <MapPin className="h-3 w-3" />
          {row.original.warehouseLocation.label}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
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

interface ItemListProps {
  items: Item[];
  categories: Category[];
  pagination: PaginationData;
}

export function ItemList({ items, categories, pagination }: ItemListProps) {
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
          placeholder="Search by ID or name..."
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
        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ status: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(ITEM_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={items} />
      <Pagination {...pagination} />
    </div>
  );
}
