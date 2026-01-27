import type { CanvasCourse, CanvasModule } from "@/client/types.gen"

export const mockCourses: CanvasCourse[] = [
  { id: 12345, name: "Introduction to AI" },
  { id: 12346, name: "Machine Learning Fundamentals" },
  { id: 12347, name: "Deep Learning Advanced" },
]

export const mockModules: CanvasModule[] = [
  { id: 1001, name: "Introduction and Overview" },
  { id: 1002, name: "Machine Learning Basics" },
  { id: 1003, name: "Neural Networks" },
  { id: 1004, name: "Deep Learning Architectures" },
]

export const mockEmptyCourses: CanvasCourse[] = []
export const mockEmptyModules: CanvasModule[] = []
