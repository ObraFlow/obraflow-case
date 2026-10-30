import type { User } from '../../prisma/generated/client.js';

export interface UserSummary {
  id: number;
  name: string;
  jobTitle: string;
  initials: string;
}

/** "João Ribeiro" → "JR". Derivado do nome (não é guardado no banco para não ficar inconsistente). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts.at(-1)![0] : '';
  return (first + last).toUpperCase();
}

/** Forma resumida do usuário, usada dentro de faixas, etapas e pedidos. */
export function toUserSummary(
  user: Pick<User, 'id' | 'name' | 'jobTitle'>,
): UserSummary {
  return {
    id: user.id,
    name: user.name,
    jobTitle: user.jobTitle,
    initials: initials(user.name),
  };
}

export function toUserResponse(user: User) {
  return { ...toUserSummary(user), email: user.email };
}
