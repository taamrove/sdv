"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PERFORMER_TYPE_LABELS } from "@/lib/constants";
import { getFullName } from "@/lib/format-name";

interface ContactPerformer {
  id: string;
  type: string;
  active: boolean;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  performer: ContactPerformer | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ContactListProps {
  contacts: Contact[];
  pagination: PaginationData;
}

function getColumns(): ColumnDef<Contact>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{getFullName(row.original)}</div>
      ),
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email ?? (
            <span className="text-muted-foreground/50">—</span>
          )}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.phone ?? (
            <span className="text-muted-foreground/50">—</span>
          )}
        </span>
      ),
    },
    {
      id: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const performer = row.original.performer;
        if (!performer) {
          return <span className="text-xs text-muted-foreground/50">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={performer.active ? "outline" : "secondary"}
              className="text-xs"
            >
              {PERFORMER_TYPE_LABELS[performer.type] ?? performer.type}
            </Badge>
            {!performer.active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const performer = row.original.performer;
        if (!performer) return null;
        return (
          <div className="flex items-center justify-end">
            <Link href={`/performers/${performer.id}`}>
              <Button
                variant="ghost"
                size="icon"
                title="Open performer profile"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];
}

export function ContactList({ contacts, pagination }: ContactListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const columns = getColumns();

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
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters({ search });
          }}
          className="flex-1 min-w-[180px] max-w-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={contacts} />
      </div>
      <Pagination {...pagination} />
    </div>
  );
}
