ALTER TABLE "Classroom" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Classroom"
SET "name" = 'Ms. Hennessy''s 6th Class'
WHERE "slug" = 'brunner-class';

UPDATE "Teacher"
SET "displayName" = 'Ms. Hennessy'
WHERE "classroomId" = (SELECT "id" FROM "Classroom" WHERE "slug" = 'brunner-class');
