import { prisma } from "@/lib/prisma";
import { supplierInput } from "@/lib/schemas";
import { handle, json, readJson } from "@/lib/https";

export const dynamic = "force-dynamic";

export const GET = handle(async () =>
  json(await prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })),
);

export const POST = handle(async (req) => {
  const supplier = await prisma.supplier.create({ data: supplierInput.parse(await readJson(req)) });
  return json({ id: supplier.id }, 201);
});
