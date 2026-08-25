-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Classroom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "classWealth" INTEGER NOT NULL DEFAULT 0,
    "currencyPlural" TEXT NOT NULL DEFAULT 'Brunner Bucks',
    "currencySingular" TEXT NOT NULL DEFAULT 'Brunner Buck',
    "abbreviation" TEXT NOT NULL DEFAULT 'BB',
    "schoolYear" TEXT NOT NULL
);
INSERT INTO "new_Classroom" ("abbreviation", "classWealth", "currencyPlural", "currencySingular", "id", "name", "schoolYear") SELECT "abbreviation", "classWealth", "currencyPlural", "currencySingular", "id", "name", "schoolYear" FROM "Classroom";
DROP TABLE "Classroom";
ALTER TABLE "new_Classroom" RENAME TO "Classroom";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
