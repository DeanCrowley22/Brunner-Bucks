PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "Classroom" ADD COLUMN "slug" TEXT;
UPDATE "Classroom"
SET "slug" = CASE
  WHEN "name" LIKE '%Brunner%' THEN 'brunner-class'
  ELSE lower(replace(replace(trim("name"), ' ', '-'), '''', ''))
END;
CREATE UNIQUE INDEX "Classroom_slug_key" ON "Classroom"("slug");

CREATE TABLE "new_Teacher" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classroomId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT 'Teacher',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Teacher_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Teacher" ("id", "classroomId", "passwordHash", "displayName", "createdAt")
SELECT "id", (SELECT "id" FROM "Classroom" ORDER BY rowid LIMIT 1), "passwordHash", "displayName", "createdAt" FROM "Teacher";
DROP TABLE "Teacher";
ALTER TABLE "new_Teacher" RENAME TO "Teacher";
CREATE INDEX "Teacher_classroomId_idx" ON "Teacher"("classroomId");

CREATE TABLE "new_Pupil" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classroomId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "surnameInitial" TEXT,
  "displayName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "avatar" TEXT NOT NULL DEFAULT 'Star',
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
INSERT INTO "new_Pupil" ("id", "classroomId", "firstName", "surnameInitial", "displayName", "username", "pinHash", "avatar", "avatarSkin", "avatarHair", "avatarHairColor", "avatarEyes", "avatarOutfitId", "avatarAccessoryId", "balance", "lifetimeEarnings", "archived", "teacherNote", "createdAt")
SELECT "id", "classroomId", "firstName", "surnameInitial", "displayName", "username", "pinHash", "avatar", "avatarSkin", "avatarHair", "avatarHairColor", "avatarEyes", "avatarOutfitId", "avatarAccessoryId", "balance", "lifetimeEarnings", "archived", "teacherNote", "createdAt" FROM "Pupil";
DROP TABLE "Pupil";
ALTER TABLE "new_Pupil" RENAME TO "Pupil";
CREATE UNIQUE INDEX "Pupil_classroomId_username_key" ON "Pupil"("classroomId", "username");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
