import type { UserPublic } from "@/client/types.gen"

export const mockUser: UserPublic = {
  id: "test-user-uuid-1234",
  name: "Test User",
  onboarding_completed: true,
}

export const mockNewUser: UserPublic = {
  id: "test-user-uuid-5678",
  name: "New User",
  onboarding_completed: false,
}
