import { Check, CirclePlus, ListOrdered, Pencil, UserPlus, UserRoundX, X, type LucideIcon } from "lucide-react";
import type { AuditEvent, AuditEventType } from "@dokimos/shared";
import { orderPath, projectPath } from "@/lib/paths";

/** How an audit event is named and drawn, and where its resource lives. The list and the drawer share this. */
export const eventLabels: Record<AuditEventType, string> = {
  PROJECT_CREATED: "Obra criada",
  PROJECT_RENAMED: "Obra renomeada",
  PROJECT_ARCHIVED: "Obra arquivada",
  PROJECT_REACTIVATED: "Obra reativada",
  PROJECT_MEMBER_ADDED: "Membro adicionado",
  PROJECT_MEMBER_REMOVED: "Membro removido",
  SUPPLIER_CREATED: "Fornecedor criado",
  SUPPLIER_RENAMED: "Fornecedor renomeado",
  SUPPLIER_DISABLED: "Fornecedor desativado",
  ORDER_CREATED: "Pedido criado",
  STEP_APPROVED: "Etapa aprovada",
  STEP_REJECTED: "Etapa rejeitada",
  COA_REVISED: "Alçada publicada",
  USER_CREATED: "Usuário criado",
  USER_DISABLED: "Usuário desativado",
};

export const eventIcons: Record<AuditEventType, LucideIcon> = {
  PROJECT_CREATED: CirclePlus,
  PROJECT_RENAMED: Pencil,
  PROJECT_ARCHIVED: UserRoundX,
  PROJECT_REACTIVATED: Check,
  PROJECT_MEMBER_ADDED: UserPlus,
  PROJECT_MEMBER_REMOVED: UserRoundX,
  SUPPLIER_CREATED: CirclePlus,
  SUPPLIER_RENAMED: Pencil,
  SUPPLIER_DISABLED: UserRoundX,
  ORDER_CREATED: CirclePlus,
  STEP_APPROVED: Check,
  STEP_REJECTED: X,
  COA_REVISED: ListOrdered,
  USER_CREATED: UserPlus,
  USER_DISABLED: UserRoundX,
};

/** The page that shows the record an event is about. Suppliers have no page of their own: the list is searched. */
export function resourceLink(event: AuditEvent) {
  const { kind, id, name } = event.resource;
  if (kind === "PURCHASE_ORDER") return orderPath(id);
  if (kind === "PROJECT") return projectPath(id);
  if (kind === "SUPPLIER") return `/admin/suppliers?${new URLSearchParams({ q: name, status: "all" })}`;
  return "/admin/users";
}

/** The record's kind as a word, for link text such as "Abrir pedido". */
export function resourceNoun(kind: AuditEvent["resource"]["kind"]) {
  if (kind === "PURCHASE_ORDER") return "pedido";
  if (kind === "PROJECT") return "obra";
  if (kind === "SUPPLIER") return "fornecedor";
  return "usuário";
}
