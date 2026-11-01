import type { RefObject } from "react";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { RefreshButton } from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./ProjectMembers.module.css";

export type MembersView = "members" | "add";

/** Top of the members dialog: title, the switch between the member list and the people to add, search, refresh. */
export function MembersHeader({
  projectName,
  view,
  onViewChange,
  readOnly,
  controlsLocked,
  writing,
  query,
  onQueryChange,
  searchRef,
  refreshing,
  onRefresh,
}: {
  projectName: string;
  view: MembersView;
  onViewChange: (view: MembersView) => void;
  readOnly: boolean;
  /** A write runs or a removal waits for confirmation: nothing here may change the list. */
  controlsLocked: boolean;
  writing: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className={styles.header}>
      <DialogHeader identifier={projectName}>
        <DialogTitle className="pr-0">Gerenciar membros</DialogTitle>
      </DialogHeader>
      <div className={styles.viewHeading}>
        <h3>{view === "members" ? "Membros" : "Adicionar usuários"}</h3>
        {view === "members" ? (
          <Button disabled={readOnly || controlsLocked} onClick={() => onViewChange("add")}>
            <Plus aria-hidden="true" />
            Adicionar usuários
          </Button>
        ) : (
          <Button
            variant="ghost"
            aria-label="Voltar aos membros"
            disabled={controlsLocked}
            onClick={() => onViewChange("members")}
          >
            <ArrowLeft aria-hidden="true" />
            Membros
          </Button>
        )}
      </div>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="member-search">
            Buscar usuários
          </label>
          <input
            ref={searchRef}
            id="member-search"
            disabled={controlsLocked}
            placeholder={view === "members" ? "Buscar membros da obra" : "Buscar por nome ou usuário"}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button
              type="button"
              disabled={controlsLocked}
              aria-label="Limpar busca de usuários"
              onClick={() => {
                onQueryChange("");
                searchRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <RefreshButton
          refreshing={refreshing}
          disabled={writing}
          onClick={onRefresh}
          aria-label="Atualizar membros"
          iconOnly
        />
      </div>
    </header>
  );
}
