import type { Ref } from "react";
import { CircleAlert, Plus, X } from "lucide-react";
import type { ProjectMember, UserSummary } from "@dokimos/shared";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import type { MemberFailure } from "./useProjectMembers";
import styles from "./ProjectMembers.module.css";

/** What the row of the member being removed shows. Only that row gets one. */
type MemberRemoval = {
  failure: MemberFailure | null;
  /** The member is in the published ladder, so the API would refuse. */
  coaBlocked: boolean;
  /** The member still has undecided steps in pending orders. */
  pendingBlocked: boolean;
  /** The refreshed list no longer has this membership. */
  gone: boolean;
};

/** One member of the project, or, when `removal` is set, the same row asking to confirm their removal. */
export function MemberRow({
  member,
  user,
  level,
  removal,
  locked,
  writing,
  removalOpen,
  cancelRef,
  onAskRemoval,
  onConfirmRemoval,
  onCancelRemoval,
}: {
  member: ProjectMember;
  /** The same person in the user directory, when it has loaded. */
  user?: UserSummary;
  /** Position in the published ladder, or -1 when not part of it. */
  level: number;
  removal?: MemberRemoval;
  locked: boolean;
  /** A write is running. */
  writing: boolean;
  /** Some member's removal is waiting for confirmation, so no other row can start one. */
  removalOpen: boolean;
  cancelRef: Ref<HTMLButtonElement>;
  onAskRemoval: (member: ProjectMember) => void;
  onConfirmRemoval: (userId: string) => void;
  onCancelRemoval: () => void;
}) {
  const confirmationId = `member-removal-${member.userId}`;
  return (
    <li className={styles.memberRow} data-member-id={member.userId}>
      <div className={`${styles.person} ${styles.member}`}>
        <UserAvatar username={user?.username ?? member.userId} displayName={member.displayName} size={36} />
        <div className={styles.identity}>
          <div>
            <p>{member.displayName}</p>
            {user && <small>@{user.username}</small>}
          </div>
          {removal ? (
            <div id={confirmationId} className={styles.inlineMessage}>
              {removal.failure || removal.coaBlocked ? (
                <p role="alert" className={styles.blocked}>
                  <CircleAlert size={15} aria-hidden="true" />
                  <span>{removal.failure?.message ?? "Este membro está na alçada publicada."}</span>
                </p>
              ) : (
                <p>Remover da obra? Os pedidos e decisões anteriores continuam visíveis.</p>
              )}
              {removal.gone && <p role="status">Este vínculo já não consta na lista atualizada.</p>}
            </div>
          ) : (
            <div className={styles.metadata}>
              <span className={styles.state} data-active={member.isActive}>
                {member.isActive ? "Ativo" : "Inativo"}
                {user?.role === "ADMIN" ? " · Administrador" : ""}
              </span>
              {level >= 0 && (
                <small className={styles.assignment} title={`Na alçada publicada · Nível ${level + 1}`}>
                  <span className={styles.assignmentDesktop}>Na alçada publicada · </span>
                  <span className={styles.assignmentMobile}>Alçada · </span>Nível {level + 1}
                </small>
              )}
            </div>
          )}
        </div>
        {removal ? (
          <div className={styles.confirmActions}>
            {!removal.coaBlocked && !removal.pendingBlocked && (
              <Button
                variant="destructive"
                aria-label="Confirmar remoção"
                aria-describedby={confirmationId}
                disabled={locked || removal.gone}
                onClick={() => onConfirmRemoval(member.userId)}
              >
                {writing ? "Removendo…" : "Confirmar remoção"}
              </Button>
            )}
            <Button
              ref={cancelRef}
              variant="ghost"
              className={styles.cancel}
              aria-label="Cancelar remoção"
              aria-describedby={confirmationId}
              disabled={writing}
              onClick={onCancelRemoval}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            data-remove-member={member.userId}
            disabled={locked || removalOpen}
            aria-label={`Remover ${member.displayName} da obra`}
            onClick={() => onAskRemoval(member)}
          >
            Remover
          </Button>
        )}
      </div>
    </li>
  );
}

/** One person who could join the project. */
export function CandidateRow({
  user,
  disabled,
  onAdd,
}: {
  user: UserSummary;
  disabled: boolean;
  onAdd: (userId: string) => void;
}) {
  return (
    <li className={styles.person}>
      <UserAvatar username={user.username} displayName={user.displayName} size={36} />
      <div className={styles.identity}>
        <p>{user.displayName}</p>
        <small>@{user.username}</small>
        {user.role === "ADMIN" && <span className={styles.state}>Administrador</span>}
      </div>
      <Button
        type="button"
        variant="outline"
        data-add-member={user.id}
        disabled={disabled}
        aria-label={`Adicionar ${user.displayName} à obra`}
        onClick={() => onAdd(user.id)}
      >
        <Plus aria-hidden="true" />
        Adicionar
      </Button>
    </li>
  );
}
