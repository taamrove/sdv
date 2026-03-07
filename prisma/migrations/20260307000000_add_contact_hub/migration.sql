-- Contact Hub: add Contact, Address, Company models
-- Modify Performer (contactId required, personal fields removed)
-- Modify User (add optional contactId)

-- 1. Create Contact table
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- 2. Create Address table
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "line1" TEXT,
    "line2" TEXT,
    "city" TEXT,
    "postCode" TEXT,
    "country" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- 3. Create ContactAddress join table
CREATE TABLE "public"."ContactAddress" (
    "contactId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    CONSTRAINT "ContactAddress_pkey" PRIMARY KEY ("contactId","addressId")
);

-- 4. Create Company table
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatNo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- 5. Create CompanyAddress join table
CREATE TABLE "public"."CompanyAddress" (
    "companyId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    CONSTRAINT "CompanyAddress_pkey" PRIMARY KEY ("companyId","addressId")
);

-- 6. Create ContactCompany join table
CREATE TABLE "public"."ContactCompany" (
    "contactId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT,
    CONSTRAINT "ContactCompany_pkey" PRIMARY KEY ("contactId","companyId")
);

-- 7. Modify Performer: add contactId, drop personal fields
ALTER TABLE "public"."Performer"
    ADD COLUMN "contactId" TEXT;

-- (Performers were wiped before migration — no data migration needed)

ALTER TABLE "public"."Performer"
    ALTER COLUMN "contactId" SET NOT NULL;

ALTER TABLE "public"."Performer"
    ADD CONSTRAINT "Performer_contactId_key" UNIQUE ("contactId");

ALTER TABLE "public"."Performer"
    DROP COLUMN IF EXISTS "firstName",
    DROP COLUMN IF EXISTS "lastName",
    DROP COLUMN IF EXISTS "email",
    DROP COLUMN IF EXISTS "phone";

-- 8. Modify User: add optional contactId
ALTER TABLE "auth"."User"
    ADD COLUMN "contactId" TEXT;

ALTER TABLE "auth"."User"
    ADD CONSTRAINT "User_contactId_key" UNIQUE ("contactId");

-- 9. Foreign key constraints
ALTER TABLE "public"."ContactAddress"
    ADD CONSTRAINT "ContactAddress_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ContactAddress"
    ADD CONSTRAINT "ContactAddress_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompanyAddress"
    ADD CONSTRAINT "CompanyAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CompanyAddress"
    ADD CONSTRAINT "CompanyAddress_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ContactCompany"
    ADD CONSTRAINT "ContactCompany_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ContactCompany"
    ADD CONSTRAINT "ContactCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Performer"
    ADD CONSTRAINT "Performer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON UPDATE CASCADE;

ALTER TABLE "auth"."User"
    ADD CONSTRAINT "User_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
