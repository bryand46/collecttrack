-- CreateTable
CREATE TABLE "CollectorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preferredGroups" TEXT NOT NULL DEFAULT '[]',
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "CollectorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectorProfile_userId_key" ON "CollectorProfile"("userId");
