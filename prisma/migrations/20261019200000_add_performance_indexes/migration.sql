-- Performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_branchId_idx"         ON "products"("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_branchId_isPinned_idx" ON "products"("branchId","isPinned");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_branchId_idx"             ON "sales"("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_branchId_createdAt_idx"   ON "sales"("branchId","createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_legalEntityId_idx"        ON "sales"("legalEntityId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_createdAt_idx"            ON "sales"("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sale_items_saleId_idx"          ON "sale_items"("saleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sale_items_productId_idx"       ON "sale_items"("productId");
