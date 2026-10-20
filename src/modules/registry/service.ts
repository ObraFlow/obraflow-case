import { z } from "zod";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/http";

export const registryInput = z.strictObject({ name: z.string().trim().min(1).max(120) });
const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().max(Number.MAX_SAFE_INTEGER));
export const paginationQuery = z
  .strictObject({
    page: positiveInteger.default(1),
    pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
  })
  .refine(({ page, pageSize }) => Number.isSafeInteger((page - 1) * pageSize), {
    message: "Página fora do limite permitido.",
    path: ["page"],
  });
export const noQuery = z.strictObject({});
export type RegistryKind = "projects" | "users" | "suppliers";
type RegistryRecord = { id: string; name: string; createdAt: Date };
const selection = { id: true, name: true, createdAt: true } as const;
function store(database: Prisma.TransactionClient, kind: RegistryKind) {
  return {
    count: (): Promise<number> =>
      kind === "projects"
        ? database.project.count()
        : kind === "users"
          ? database.user.count()
          : database.supplier.count(),
    find: (id: string): Promise<RegistryRecord | null> => {
      const args = { where: { id }, select: selection };
      return kind === "projects"
        ? database.project.findUnique(args)
        : kind === "users"
          ? database.user.findUnique(args)
          : database.supplier.findUnique(args);
    },
    list: (skip: number, take: number): Promise<RegistryRecord[]> => {
      const args = {
        skip,
        take,
        select: selection,
        orderBy: [{ name: "asc" as const }, { id: "asc" as const }],
      };
      return kind === "projects"
        ? database.project.findMany(args)
        : kind === "users"
          ? database.user.findMany(args)
          : database.supplier.findMany(args);
    },
    create: (name: string): Promise<RegistryRecord> => {
      const args = { data: { name }, select: selection };
      return kind === "projects"
        ? database.project.create(args)
        : kind === "users"
          ? database.user.create(args)
          : database.supplier.create(args);
    },
  };
}
export async function listRegistry(
  database: PrismaClient,
  kind: RegistryKind,
  query: z.output<typeof paginationQuery>,
) {
  return database.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
      const repository = store(transaction, kind);
      const total = await repository.count();
      const skip = (query.page - 1) * query.pageSize;
      const data = skip >= total ? [] : await repository.list(skip, query.pageSize);
      return {
        data,
        pagination: { ...query, total, totalPages: Math.ceil(total / query.pageSize) },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function getRegistry(database: PrismaClient, kind: RegistryKind, id: string) {
  const record = await store(database, kind).find(id);
  if (!record)
    throw new ApiError(
      404,
      kind === "projects"
        ? "PROJECT_NOT_FOUND"
        : kind === "users"
          ? "USER_NOT_FOUND"
          : "SUPPLIER_NOT_FOUND",
      "Cadastro não encontrado.",
    );
  return record;
}
export async function createRegistry(
  database: PrismaClient,
  kind: RegistryKind,
  input: z.output<typeof registryInput>,
) {
  return store(database, kind).create(registryInput.parse(input).name);
}
