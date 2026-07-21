/*
  Warnings:

  - You are about to drop the column `contentType` on the `templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[templateId,slug]` on the table `pages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slugPrefix]` on the table `templates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slugPrefix` to the `templates` table (backfilled below before being made NOT NULL).

*/
-- DropIndex
DROP INDEX "pages_slug_key";

-- DropIndex
DROP INDEX "templates_contentType_key";

-- AlterTable
ALTER TABLE "template_placeholders" ADD COLUMN     "autoFillMap" JSONB;

-- AlterTable: drop contentType, add slugPrefix as NULLABLE first (existing rows need backfill)
ALTER TABLE "templates" DROP COLUMN "contentType",
ADD COLUMN     "slugPrefix" TEXT;

-- DropEnum
DROP TYPE "ContentType";

-- Backfill: existing Template rows (e.g. "Project") get slugPrefix = lowercase(name) + "s"
UPDATE "templates"
SET "slugPrefix" = lower("name") || 's'
WHERE "slugPrefix" IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE "templates" ALTER COLUMN "slugPrefix" SET NOT NULL;

-- CreateTable
CREATE TABLE "placeholder_overrides" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageId" TEXT NOT NULL,
    "placeholderId" TEXT NOT NULL,

    CONSTRAINT "placeholder_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placeholder_overrides_pageId_placeholderId_key" ON "placeholder_overrides"("pageId", "placeholderId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_templateId_slug_key" ON "pages"("templateId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slugPrefix_key" ON "templates"("slugPrefix");

-- CreateIndex (manual — Prisma cannot express partial unique indexes in schema.prisma)
-- Enforces global slug uniqueness ONLY for static pages (templateId IS NULL).
-- Pages under a template are covered by "pages_templateId_slug_key" above instead;
-- Postgres treats multiple NULLs as distinct, so templateId IS NULL rows are NOT
-- covered by that composite unique index and need this separate partial index.
CREATE UNIQUE INDEX "pages_static_slug_unique"
ON "pages" ("slug")
WHERE "templateId" IS NULL;

-- AddForeignKey
ALTER TABLE "placeholder_overrides" ADD CONSTRAINT "placeholder_overrides_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placeholder_overrides" ADD CONSTRAINT "placeholder_overrides_placeholderId_fkey" FOREIGN KEY ("placeholderId") REFERENCES "template_placeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;