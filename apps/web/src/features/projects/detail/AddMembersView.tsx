import { plural } from "@/lib/format";
import type { UserSummary } from "@dokimos/shared";
import { Loading } from "@/components/Loading";
import { EmptyState, ErrorState } from "@/components/Feedback";
import { CandidateRow } from "./MemberRow";
import styles from "./ProjectMembers.module.css";

/** The users who could join the project: loading, error, empty (with or without a search) and the list. */
export function AddMembersView({
  users,
  available,
  candidates,
  query,
  loading,
  error,
  addLocked,
  clearDisabled,
  onClearQuery,
  onRetry,
  onAdd,
}: {
  /** The user directory, or null before it has loaded. */
  users: UserSummary[] | null;
  /** Active users who are not members yet. */
  available: UserSummary[];
  /** The available users matching the search. */
  candidates: UserSummary[];
  query: string;
  loading: boolean;
  error: unknown;
  addLocked: boolean;
  clearDisabled: boolean;
  onClearQuery: () => void;
  onRetry: () => void;
  onAdd: (userId: string) => void;
}) {
  return (
    <>
      {loading && !users && <Loading message="Consultando usuários disponíveis…" />}
      {!!error && !users && <ErrorState compact error={error} retry={onRetry} />}
      {users && (
        <>
          <p className={styles.count}>
            {candidates.length} de {available.length}{" "}
            {plural(available.length, "usuário disponível", "usuários disponíveis")} · somente ativos
          </p>
          {!candidates.length ? (
            <EmptyState
              compact
              title={
                query ? "Nenhum usuário disponível corresponde à busca." : "Não há outros usuários ativos disponíveis."
              }
              action={query ? { label: "Limpar busca", onClick: onClearQuery, disabled: clearDisabled } : undefined}
            />
          ) : (
            <ul className={styles.list} aria-label="Usuários disponíveis">
              {candidates.map((user) => (
                <CandidateRow key={user.id} user={user} disabled={addLocked} onAdd={onAdd} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
