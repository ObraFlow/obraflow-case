import { plural } from "@/lib/format";
import { Users } from "lucide-react";
import type { ProjectMember } from "@dokimos/shared";
import { AvatarStack } from "./AvatarStack";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import styles from "./ProjectMembers.module.css";

/** The card on the project page: who is in, and the button that opens the members dialog. Render it inside the Dialog. */
export function MembersSummary({
  members,
  usernameOf,
  readOnly,
}: {
  /** Null while the first read has not finished. */
  members: ProjectMember[] | null;
  usernameOf: (member: ProjectMember) => string | undefined;
  readOnly: boolean;
}) {
  const firstNames = members?.slice(0, 2).map((member) => member.displayName) ?? [];
  const names =
    members && members.length > 2 ? `${firstNames.join(", ")} e +${members.length - 2}` : firstNames.join(" e ");
  return (
    <div className={styles.summary}>
      <div className="min-w-0">
        <h2 id="members-title" className="font-semibold">
          Membros da obra
        </h2>
        {members && !!members.length && (
          <div className={styles.summaryPeople} aria-label="Resumo dos membros">
            <AvatarStack
              people={members.map((member) => ({
                id: member.userId,
                username: usernameOf(member) ?? member.userId,
                displayName: member.displayName,
              }))}
            />
            <div className="min-w-0">
              <p className="break-words text-sm" title={members.map((member) => member.displayName).join(", ")}>
                {names}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {members.length} {plural(members.length, "membro", "membros")} ·{" "}
                {members.filter((member) => member.isActive).length}{" "}
                {plural(members.filter((member) => member.isActive).length, "ativo", "ativos")}
              </p>
            </div>
          </div>
        )}
        {members && !members.length && (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum membro. Adicione usuários para configurar a obra.</p>
        )}
      </div>
      <DialogTrigger disabled={readOnly} render={<Button variant="outline" />}>
        <Users aria-hidden="true" />
        Gerenciar membros
      </DialogTrigger>
    </div>
  );
}
