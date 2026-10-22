-- CreateTable
CREATE TABLE "_CourseToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToProject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CourseToProject_B_index" ON "_CourseToProject"("B");

-- AddForeignKey
ALTER TABLE "_CourseToProject" ADD CONSTRAINT "_CourseToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToProject" ADD CONSTRAINT "_CourseToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
