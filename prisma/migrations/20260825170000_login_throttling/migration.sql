CREATE TABLE "LoginAccessAttempt" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" DATETIME,
  "updatedAt" DATETIME NOT NULL
);
