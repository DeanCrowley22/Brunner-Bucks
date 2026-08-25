-- CreateTable
CREATE TABLE "AvatarItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rewardId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "eventOnly" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AvatarItem_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PupilAvatarItem" (
    "pupilId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("pupilId", "itemId"),
    CONSTRAINT "PupilAvatarItem_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PupilAvatarItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AvatarItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pupil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "surnameInitial" TEXT,
    "displayName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'Star',
    "imagePath" TEXT,
    "avatarSkin" TEXT NOT NULL DEFAULT 'warm',
    "avatarHair" TEXT NOT NULL DEFAULT 'short',
    "avatarHairColor" TEXT NOT NULL DEFAULT 'brown',
    "avatarEyes" TEXT NOT NULL DEFAULT 'brown',
    "avatarOutfitId" TEXT,
    "avatarAccessoryId" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarnings" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "teacherNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pupil_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pupil" ("archived", "avatar", "balance", "classroomId", "createdAt", "displayName", "firstName", "id", "imagePath", "lifetimeEarnings", "pinHash", "surnameInitial", "teacherNote", "username") SELECT "archived", "avatar", "balance", "classroomId", "createdAt", "displayName", "firstName", "id", "imagePath", "lifetimeEarnings", "pinHash", "surnameInitial", "teacherNote", "username" FROM "Pupil";
DROP TABLE "Pupil";
ALTER TABLE "new_Pupil" RENAME TO "Pupil";
CREATE UNIQUE INDEX "Pupil_username_key" ON "Pupil"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AvatarItem_rewardId_key" ON "AvatarItem"("rewardId");

-- CreateIndex
CREATE UNIQUE INDEX "AvatarItem_assetKey_key" ON "AvatarItem"("assetKey");
