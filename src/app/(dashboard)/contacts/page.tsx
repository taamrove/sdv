import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ContactList } from "@/components/contacts/contact-list";
import { Prisma } from "@prisma/client";

interface SearchParams {
  page?: string;
  search?: string;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 30;
  const skip = (page - 1) * limit;

  const where: Prisma.ContactWhereInput = {};
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        performer: {
          select: { id: true, type: true, active: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="All people in the system — performers, users, and collaborators"
      />
      <ContactList
        contacts={contacts}
        pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      />
    </div>
  );
}
