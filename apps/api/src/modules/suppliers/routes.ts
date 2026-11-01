import type { FastifyInstance } from "fastify";
import { createSupplierSchema, renameSupplierSchema } from "@dokimos/shared";
import { adminOnly, authenticated, currentActor } from "../../auth/guards.js";
import { parseBody, uuidParam, type IdParams } from "../../lib/validation.js";
import * as suppliers from "./service.js";

export async function supplierRoutes(app: FastifyInstance): Promise<void> {
  // GET /suppliers: every supplier, including inactive ones.
  app.get("/suppliers", authenticated, async () => ({ data: await suppliers.listSuppliers() }));

  app.post("/suppliers", adminOnly, async (request, reply) => {
    const { name } = parseBody(createSupplierSchema, request.body);
    return reply.code(201).send(await suppliers.createSupplier(currentActor(request), name));
  });

  // PATCH /suppliers/:id: renames an active supplier (ADMIN only).
  app.patch<IdParams>("/suppliers/:id", adminOnly, async (request) => {
    const { name } = parseBody(renameSupplierSchema, request.body);
    return suppliers.renameSupplier(currentActor(request), uuidParam(request.params.id), name);
  });

  // DELETE /suppliers/:id: logical deactivation; history keeps pointing at the supplier.
  app.delete<IdParams>("/suppliers/:id", adminOnly, async (request, reply) => {
    await suppliers.deactivateSupplier(currentActor(request), uuidParam(request.params.id));
    return reply.code(204).send();
  });
}
