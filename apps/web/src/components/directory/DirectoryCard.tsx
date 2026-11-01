import { useId } from "react";
import { Building2, LockKeyhole } from "lucide-react";
import type { Role } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import styles from "./DirectoryCard.module.css";
import { roleLabel } from "@/lib/format";

export type DirectoryEntry = { id: string; name: string; isActive: boolean; username?: string; role?: Role };

/** A user shows its handle and profile; a supplier shows whether new orders can use it. */
function subtitle(entry: DirectoryEntry, users: boolean) {
  if (users) return `@${entry.username} · ${entry.role ? roleLabel(entry.role) : ""}`;
  return entry.isActive ? "Disponível para novos pedidos" : "Cadastro desativado";
}

export function DirectoryCard({
  entry,
  kind,
  disabled,
  onDeactivate,
  onRename,
}: {
  entry: DirectoryEntry;
  kind: "users" | "suppliers";
  disabled: boolean;
  onDeactivate: () => void;
  onRename?: () => void;
}) {
  const nameId = useId();
  const users = kind === "users";
  return (
    <li className={styles.card} data-active={entry.isActive} aria-labelledby={nameId}>
      {users && entry.username ? (
        <UserAvatar username={entry.username} displayName={entry.name} size={40} />
      ) : (
        <span className={styles.icon} aria-hidden="true">
          <Building2 size={19} />
        </span>
      )}
      <div className={styles.identity}>
        <h2 id={nameId}>{entry.name}</h2>
        <p>{subtitle(entry, users)}</p>
      </div>
      <div className={styles.controls}>
        <span className={styles.status} data-active={entry.isActive}>
          {entry.isActive ? "Ativo" : "Inativo"}
        </span>
        <div className={styles.action}>
          {!users && entry.isActive && onRename && (
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-label={`Renomear ${entry.name}`}
              onClick={onRename}
            >
              Renomear
            </Button>
          )}
          {entry.role === "ADMIN" ? (
            <span className={styles.protected}>
              <LockKeyhole size={13} aria-hidden="true" />
              Conta protegida
            </span>
          ) : entry.isActive ? (
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-label={`Desativar ${entry.name}`}
              onClick={onDeactivate}
            >
              Desativar
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
