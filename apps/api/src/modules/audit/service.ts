import type { AuditQuery } from "@dokimos/shared";
import { dataSource } from "../../db/data-source.js";
import { queryAuditEvents } from "./events-query.js";

// Trusted read: the HTTP caller must enforce ADMIN. Count and page must share
// one repeatable-read snapshot; projection helpers never create transactions.
export const listAuditEvents = (filters: AuditQuery) =>
  dataSource.transaction("REPEATABLE READ", (manager) => queryAuditEvents(manager, filters));
