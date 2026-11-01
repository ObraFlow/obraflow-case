import { prisma } from "@/lib/prisma";
import { siteInput } from "@/lib/schemas";
import { handle, json, readJson } from "@/lib/https";

export const dynamic = "force-dynamic";

export const GET = handle(async () =>
  json(await prisma.site.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })),
);

export const POST = handle(async (req) => {
  const site = await prisma.site.create({ data: siteInput.parse(await readJson(req)) });
  return json({ id: site.id }, 201);
});
