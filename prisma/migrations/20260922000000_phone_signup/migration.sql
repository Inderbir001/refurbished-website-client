-- Customers sign up and sign in with a phone number; email becomes optional.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- A phone number can belong to one account only. Test data could contain the same number twice: keep the oldest account's number.
UPDATE "User" u SET "phone" = NULL
WHERE u."phone" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" o WHERE o."phone" = u."phone" AND (o."createdAt", o."id") < (u."createdAt", u."id"));

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
