-- Migration: add_favorites
-- Adds favorites table and foreign key relations to users and courses

CREATE TABLE "favorites" (
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("userId","courseId")
);

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
