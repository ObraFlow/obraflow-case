import { projectPath } from "@/lib/paths";
import { plural } from "@/lib/format";
import { useId } from "react";
import { Link } from "react-router";
import { Building2, Star, Users } from "lucide-react";
import { type ProjectListItem } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import styles from "./ProjectCard.module.css";

/** Name first, then one meta row: members and the alçada state. Captions are left out on purpose; the icon,
 * the text and the title say what each fact is, and "Arquivada" appears only when it is not the default. */
export function ProjectCard({
  project,
  favorite,
  onToggleFavorite,
}: {
  project: ProjectListItem;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const titleId = useId();
  const { count, activeCount } = project.membership;
  const inactive = count - activeCount;
  const members = `${count} ${plural(count, "membro", "membros")}${inactive > 0 ? ` · ${inactive} ${plural(inactive, "inativo", "inativos")}` : ""}`;
  const configured = project.coaVersion > 0;
  return (
    <li className={styles.card} aria-labelledby={titleId}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Building2 size={22} />
        </span>
        <div className={styles.identity}>
          <h2 id={titleId} aria-label={project.name}>
            <Link className={styles.projectLink} to={projectPath(project.id)} aria-label={`Configurar ${project.name}`}>
              {project.name}
            </Link>
          </h2>
          <p className={styles.meta}>
            <span
              className={styles.members}
              title={`${count} ${plural(count, "membro", "membros")}, ${activeCount} ${plural(activeCount, "ativo", "ativos")}`}
            >
              <Users size={13} aria-hidden="true" />
              {members}
            </span>
            <span
              className={styles.coa}
              data-configured={configured}
              title={
                configured
                  ? `Alçada de aprovação publicada, versão ${project.coaVersion}`
                  : "Alçada de aprovação não configurada"
              }
            >
              {configured ? `Alçada v${project.coaVersion}` : "Sem alçada"}
            </span>
            {!project.isActive && <span className={styles.archived}>Arquivada</span>}
          </p>
        </div>
        <Button
          className={styles.favorite}
          variant="ghost"
          size="icon"
          aria-label={`Favoritar ${project.name}`}
          aria-pressed={favorite}
          title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={onToggleFavorite}
        >
          <Star aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
        </Button>
      </header>
    </li>
  );
}
