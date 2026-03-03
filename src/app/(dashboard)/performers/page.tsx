import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PerformerList } from "@/components/performers/performer-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PerformerType, Prisma } from "@prisma/client";

interface SearchParams {
  page?: string;
  search?: string;
  type?: string;
}

export default async function PerformersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Prisma.PerformerWhereInput = {};
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.type) {
    where.type = params.type as PerformerType;
  }

  const [performers, total] = await Promise.all([
    prisma.performer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: limit,
    }),
    prisma.performer.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performers"
        description="Manage dancers, vocalists, musicians, and other performers"
        action={
          <Link href="/performers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Performer
            </Button>
          </Link>
        }
      />
      <PerformerList
        performers={performers}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
