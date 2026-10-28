import { SkeletonTabela } from "@/components/layout/skeleton-tabela";

export default function Loading() {
  return <SkeletonTabela titulo="Regras de alçada" linhas={4} />;
}
