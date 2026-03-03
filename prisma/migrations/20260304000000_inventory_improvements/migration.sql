-- CreateTable: SubCategory
CREATE TABLE "public"."SubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeMode" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "public"."SubCategory"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "public"."SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Product: add subCategoryId FK
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "public"."SubCategory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Product: remove legacy size column
ALTER TABLE "public"."Product" DROP COLUMN IF EXISTS "size";

-- AlterTable Item: add archived flag
ALTER TABLE "public"."Item" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Item: add mainPerformerId FK
ALTER TABLE "public"."Item" ADD COLUMN IF NOT EXISTS "mainPerformerId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_mainPerformerId_fkey"
    FOREIGN KEY ("mainPerformerId") REFERENCES "public"."Performer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Performer: replace name with firstName + lastName
ALTER TABLE "public"."Performer" DROP COLUMN IF EXISTS "name";
ALTER TABLE "public"."Performer" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."Performer" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
