import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/https";


export const GET = handle(async () =>
  json(await prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })),
);
