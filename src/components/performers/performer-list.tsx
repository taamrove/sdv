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
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PERFORMER_TYPE_LABELS } from "@/lib/constants";
import { getFullName } from "@/lib/format-name";

interface Performer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: string;
  active: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PerformerListProps {
  performers: Performer[];
  pagination: PaginationData;
}

const columns: ColumnDef<Performer>[] = [
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{getFullName(row.original)}</div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline">
        {PERFORMER_TYPE_LABELS[row.original.type] ?? row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.email ?? "-"}
      </span>
    ),
  },
  {
    accessorKey: "active",
    header: "Active",
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/performers/${row.original.id}`}>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

export function PerformerList({
  performers,
  pagination,
}: PerformerListProps) {
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
          placeholder="Search performers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters({ search });
          }}
          className="max-w-sm"
        />
        <Select
          value={searchParams.get("type") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ type: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(PERFORMER_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={performers} />
      <Pagination {...pagination} />
    </div>
  );
}
