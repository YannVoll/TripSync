-- CreateTable
CREATE TABLE "TripNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tripId" INTEGER NOT NULL,
    "daysBefore" INTEGER NOT NULL DEFAULT 1,
    "email" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripNotification_userId_idx" ON "TripNotification"("userId");

-- CreateIndex
CREATE INDEX "TripNotification_tripId_idx" ON "TripNotification"("tripId");

-- AddForeignKey
ALTER TABLE "TripNotification" ADD CONSTRAINT "TripNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripNotification" ADD CONSTRAINT "TripNotification_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
