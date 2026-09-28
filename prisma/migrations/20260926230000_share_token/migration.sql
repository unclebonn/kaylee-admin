-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_shareToken_key" ON "Booking"("shareToken");

