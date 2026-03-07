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
import { Pencil, PowerOff, Power } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PERFORMER_TYPE_LABELS } from "@/lib/constants";
import { getFullName } from "@/lib/format-name";
import { deletePerformer, updatePerformer } from "@/actions/performers";
import { toast } from "sonner";

interface Contact {
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Performer {
  id: string;
  contact: Contact;
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

function getColumns(
  onDeactivate: (id: string) => void,
  onReactivate: (id: string) => void,
  isPending: boolean
): ColumnDef<Performer>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{getFullName(row.original.contact)}</div>
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
      id: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.contact.email ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.active ? (
            <Button
              variant="ghost"
              size="icon"
              title="Deactivate performer"
              disabled={isPending}
              onClick={() => onDeactivate(row.original.id)}
            >
              <PowerOff className="h-4 w-4 text-muted-foreground" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Reactivate performer"
              disabled={isPending}
              onClick={() => onReactivate(row.original.id)}
            >
              <Power className="h-4 w-4 text-green-600" />
            </Button>
          )}
          <Link href={`/performers/${row.original.id}`}>
            <Button variant="ghost" size="icon" title="Edit performer">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];
}

export function PerformerList({
  performers,
  pagination,
}: PerformerListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [isPending, startTransition] = useTransition();

  function applyFilters(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.set("page", "1");
    router.push(`?${sp.toString()}`);
  }

  function handleDeactivate(id: string) {
    if (!window.confirm("Deactivate this performer? They will be hidden from active lists.")) return;
    startTransition(async () => {
      const result = await deletePerformer(id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Performer deactivated");
        router.refresh();
      }
    });
  }

  function handleReactivate(id: string) {
    startTransition(async () => {
      const result = await updatePerformer(id, { active: true });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Performer reactivated");
        router.refresh();
      }
    });
  }

  const columns = getColumns(handleDeactivate, handleReactivate, isPending);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search performers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters({ search });
          }}
          className="flex-1 min-w-[180px] max-w-sm"
        />
        <Select
          value={searchParams.get("type") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ type: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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
        <Select
          value={searchParams.get("active") ?? "all"}
          onValueChange={(val) =>
            applyFilters({ active: val === "all" ? "" : val })
          }
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active only</SelectItem>
            <SelectItem value="false">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={performers} />
      </div>
      <Pagination {...pagination} />
    </div>
  );
}
