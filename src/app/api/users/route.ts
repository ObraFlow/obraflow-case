import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/https";

export const dynamic = "force-dynamic";

export const GET = handle(async () =>
  json(await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })),
);
