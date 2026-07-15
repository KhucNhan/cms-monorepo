CREATE UNIQUE INDEX "PageVersion_one_draft_per_page"
ON "page_versions" ("pageId")
WHERE status = 'DRAFT';