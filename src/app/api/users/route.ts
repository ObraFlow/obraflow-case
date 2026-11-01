import { prisma } from "@/lib/prisma";
import { userInput } from "@/lib/schemas";
import { handle, json, readJson } from "@/lib/https";

export const dynamic = "force-dynamic";

export const GET = handle(async () =>
  json(await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })),
);

export const POST = handle(async (req) => {
  const user = await prisma.user.create({ data: userInput.parse(await readJson(req)) });
  return json({ id: user.id }, 201);
});
