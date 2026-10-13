/*
  Warnings:

  - The values [COMPLETED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [POUSADA] on the enum `PropertyType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PropertyType_new" AS ENUM ('HOUSE', 'APARTMENT', 'STUDIO', 'VILLA', 'TOWNHOUSE', 'HOTEL');
ALTER TABLE "Property" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Property" ALTER COLUMN "type" TYPE "PropertyType_new" USING ("type"::text::"PropertyType_new");
ALTER TYPE "PropertyType" RENAME TO "PropertyType_old";
ALTER TYPE "PropertyType_new" RENAME TO "PropertyType";
DROP TYPE "PropertyType_old";
ALTER TABLE "Property" ALTER COLUMN "type" SET DEFAULT 'HOUSE';
COMMIT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentData" JSONB,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "status" SET DEFAULT 'PENDING';
