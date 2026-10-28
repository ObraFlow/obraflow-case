import { SkeletonTabela } from "@/components/layout/skeleton-tabela";

export default function Loading() {
  return <SkeletonTabela titulo="Aprovações" linhas={6} />;
}
