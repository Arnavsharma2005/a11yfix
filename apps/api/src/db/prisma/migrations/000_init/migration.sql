CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'CRAWLING', 'SCANNING', 'COMPLETED', 'FAILED');

CREATE TYPE "ViolationStatus" AS ENUM ('OPEN', 'FIX_GENERATED', 'PR_OPENED', 'RESOLVED', 'IGNORED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "githubId" TEXT NOT NULL,
  "githubLogin" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "name" TEXT,
  "githubRepo" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scan" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
  "pagesScanned" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScannedPage" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "pageUrl" TEXT NOT NULL,
  "title" TEXT,
  "rawHtml" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScannedPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Violation" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "pageUrl" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "wcagCriteria" TEXT NOT NULL,
  "impact" TEXT NOT NULL,
  "selector" TEXT NOT NULL,
  "htmlSnippet" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priorityScore" INTEGER NOT NULL,
  "fixAvailable" BOOLEAN NOT NULL DEFAULT false,
  "suggestedFix" TEXT,
  "status" "ViolationStatus" NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB,
  "prUrl" TEXT,

  CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
CREATE INDEX "Site_ownerUserId_idx" ON "Site"("ownerUserId");
CREATE INDEX "Scan_siteId_idx" ON "Scan"("siteId");
CREATE INDEX "Scan_status_idx" ON "Scan"("status");
CREATE UNIQUE INDEX "ScannedPage_scanId_pageUrl_key" ON "ScannedPage"("scanId", "pageUrl");
CREATE INDEX "ScannedPage_scanId_idx" ON "ScannedPage"("scanId");
CREATE INDEX "Violation_scanId_idx" ON "Violation"("scanId");
CREATE INDEX "Violation_ruleId_idx" ON "Violation"("ruleId");
CREATE INDEX "Violation_priorityScore_idx" ON "Violation"("priorityScore");

ALTER TABLE "Site"
  ADD CONSTRAINT "Site_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Scan"
  ADD CONSTRAINT "Scan_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScannedPage"
  ADD CONSTRAINT "ScannedPage_scanId_fkey"
  FOREIGN KEY ("scanId") REFERENCES "Scan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Violation"
  ADD CONSTRAINT "Violation_scanId_fkey"
  FOREIGN KEY ("scanId") REFERENCES "Scan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
