import type { ProjectListItem, ProjectSummary, ProjectMember } from "@dokimos/shared";
import { request } from "@/lib/api";

export const getProjects = (signal?: AbortSignal) => request<{ data: ProjectListItem[] }>("/projects", { signal });
export const getProjectMembers = (id: string, signal?: AbortSignal) =>
  request<{ data: ProjectMember[] }>(`/projects/${encodeURIComponent(id)}/members`, { signal });
export const createProject = (name: string) =>
  request<ProjectSummary>("/projects", { method: "POST", body: JSON.stringify({ name }) });
export const renameProject = (id: string, name: string) =>
  request<ProjectSummary>(`/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const setProjectActive = (id: string, active: boolean) =>
  request<ProjectSummary>(`/projects/${encodeURIComponent(id)}/${active ? "reactivate" : "archive"}`, {
    method: "POST",
  });
export const addProjectMember = (id: string, userId: string) =>
  request<{ projectId: string; userId: string }>(`/projects/${encodeURIComponent(id)}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
export const removeProjectMember = (id: string, userId: string) =>
  request<void>(`/projects/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
