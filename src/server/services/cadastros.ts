// Cadastros (obras, usuários, fornecedores). Vêm do seed e não têm tela de edição,
// então ficam em cache ("use cache") por horas, com a tag "cadastros" para expirar
// na hora se um dia houver mutação (updateTag("cadastros") na action).

import { cacheLife, cacheTag } from "next/cache";
import type { FornecedorDto, ObraDto, UsuarioDto } from "@/lib/dto";
import { paraFornecedorDto, paraObraDto, paraUsuarioDto } from "@/server/dto";
import { prisma } from "@/server/prisma";

export async function listarObras(): Promise<ObraDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cadastros");

  const obras = await prisma.obra.findMany({ orderBy: { nome: "asc" } });
  return obras.map(paraObraDto);
}

export async function listarUsuarios(): Promise<UsuarioDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cadastros");

  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });
  return usuarios.map(paraUsuarioDto);
}

export async function listarFornecedores(): Promise<FornecedorDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cadastros");

  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
  return fornecedores.map(paraFornecedorDto);
}
