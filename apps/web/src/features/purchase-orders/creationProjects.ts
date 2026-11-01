import type { ProjectListItem } from "@dokimos/shared";

/** Projects where the caller may create orders: active and with a real membership. Broad ADMIN
 * reads never imply membership, and the project list already reports the caller's own
 * `membership.isMember`, so no per-project lookup is needed. The server still enforces it. */
export const creationProjects = (projects: ProjectListItem[]) =>
  projects.filter((project) => project.isActive && project.membership.isMember);
