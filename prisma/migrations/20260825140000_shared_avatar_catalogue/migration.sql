PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "Reward" ADD COLUMN "avatarItemId" TEXT REFERENCES "AvatarItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Reward"
SET "avatarItemId" = (SELECT "id" FROM "AvatarItem" WHERE "AvatarItem"."rewardId" = "Reward"."id");

CREATE TABLE "new_AvatarItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "assetKey" TEXT NOT NULL,
  "rarity" TEXT NOT NULL DEFAULT 'COMMON',
  "description" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "eventOnly" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_AvatarItem" ("id", "name", "type", "assetKey", "rarity", "description", "active", "eventOnly")
SELECT "id", "name", "type", "assetKey", "rarity", "description", "active", "eventOnly" FROM "AvatarItem";
DROP TABLE "AvatarItem";
ALTER TABLE "new_AvatarItem" RENAME TO "AvatarItem";
CREATE UNIQUE INDEX "AvatarItem_assetKey_key" ON "AvatarItem"("assetKey");
CREATE INDEX "Reward_avatarItemId_idx" ON "Reward"("avatarItemId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
