-- CreateTable
CREATE TABLE "Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "quantity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "genre" TEXT
);
