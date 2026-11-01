import { z } from "zod";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome da obra.")
  .max(150, "Use no máximo 150 caracteres.");
export const projectInputSchema = z.object({ name: projectNameSchema }).strict();

export interface ProjectSummary {
  id: string;
  name: string;
  coaVersion: number;
  isActive: boolean;
  createdAt: string;
}
// Membership figures of one project, as seen by the caller. `count` includes inactive users,
// `activeCount` only members whose account is active; `isMember` is the caller's own membership
// (ADMIN gets no implicit membership). Returned by the project list only.
export interface ProjectMembership {
  count: number;
  activeCount: number;
  isMember: boolean;
}
export interface ProjectListItem extends ProjectSummary {
  membership: ProjectMembership;
}
export interface ProjectMember {
  userId: string;
  displayName: string;
  isActive: boolean;
}
