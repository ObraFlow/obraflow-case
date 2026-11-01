import { Button } from "@/components/ui/button";

type PageInfo = { page: number; pageSize: number; total: number };
export function isPageUnavailable({ page, pageSize, total }: PageInfo) {
  return page > Math.max(1, Math.ceil(total / pageSize));
}

/** The page owns URL changes; an invalid bookmarked page never becomes a
 * normal current/total range or a sequence of hundreds of Previous clicks. */
export function Pagination({
  pagination,
  count,
  label,
  singular,
  plural,
  onPageChange,
}: {
  pagination: PageInfo;
  count: number;
  label: string;
  singular: string;
  plural: string;
  onPageChange: (page: number) => void;
}) {
  const { page, pageSize, total } = pagination;
  const unavailable = isPageUnavailable(pagination);
  const range = count ? `${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + count}` : "0";
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        {unavailable
          ? `Página solicitada indisponível · ${total} ${total === 1 ? singular : plural}`
          : `${range} de ${total} ${total === 1 ? singular : plural} · Página ${page} de ${Math.max(1, Math.ceil(total / pageSize))}`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={unavailable || page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={unavailable || page * pageSize >= total}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
