import { plural, roleLabel } from "@/lib/format";
import { DESKTOP_QUERY, prefersReducedMotion } from "@/lib/media";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronsDownUp, Info, Languages, LockKeyhole, LogOut, UsersRound } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { ChevronsUpDownIcon, type ChevronsUpDownIconHandle } from "@/components/ui/icons/chevrons-up-down";
import { Popover } from "@base-ui/react/popover";
import type { Identity } from "@dokimos/shared";
import { useAuth } from "@/auth/AuthContext";
import type { useTheme } from "@/lib/theme";
import { ThemeControl } from "./ThemeControl";
import { NotificationAvatar } from "@/features/notifications/NotificationAvatar";
import { NotificationMenuButton } from "@/features/notifications/NotificationDialog";
import { useNotifications } from "@/features/notifications/NotificationProvider";
import { PersonaSwitchDialog } from "@/auth/PersonaSwitchDialog";
import styles from "./SidebarAccount.module.css";

/** An unread count as a badge shows it: capped at 9+. */
const badgeCount = (count: number) => (count > 9 ? "9+" : String(count));
const notificationCount = (count: number) => `${count} ${plural(count, "notificação", "notificações")}`;
/** What a screen reader announces for the account trigger: who, role and the unread notifications. */
function accountLabelOf(user: Identity, count: number) {
  const identity = `${user.displayName} @${user.username} · ${roleLabel(user.role)}`;
  return count ? `${badgeCount(count)} ${identity} · ${notificationCount(count)}` : identity;
}

export function SidebarAccount({
  collapsed = false,
  mobile = false,
  theme,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const { user, signOut } = useAuth();
  const { count, openPanel } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [below, setBelow] = useState(152);
  const trigger = useRef<HTMLButtonElement>(null);
  const identity = useRef<HTMLButtonElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const demoAction = useRef<HTMLButtonElement>(null);
  const motion = useRef<Animation | null>(null);
  const restoreFocus = useRef(false);
  const demoDescription = useId();
  const triggerChevron = useRef<ChevronsUpDownIconHandle>(null);
  function chevronEvents(ref: typeof triggerChevron) {
    return {
      onMouseEnter: () => ref.current?.startAnimation(),
      onMouseLeave: () => ref.current?.stopAnimation(),
      onFocus: () => ref.current?.startAnimation(),
      onBlur: () => ref.current?.stopAnimation(),
    };
  }
  // Stable between renders (it reads only refs and `mobile`), so the opening effect below
  // still restarts only when the panel or layout changes.
  const animateIdentity = useCallback(
    (opening: boolean) => {
      const row = identity.current,
        anchor = trigger.current;
      if (mobile || !row || !anchor || prefersReducedMotion()) return;
      const current = getComputedStyle(row);
      const previous = { transform: current.transform, width: current.width };
      const moving = motion.current?.playState === "running";
      motion.current?.cancel();
      const from = anchor.getBoundingClientRect(),
        to = row.getBoundingClientRect();
      const compactCard = {
        transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`,
        width: `${from.width}px`,
      };
      motion.current = row.animate(
        opening
          ? [moving ? previous : compactCard, { transform: "translate(0, 0)", width: "100%" }]
          : [previous, compactCard],
        {
          duration: opening ? 220 : 160,
          easing: "cubic-bezier(.2,.65,.3,1)",
          fill: opening ? "none" : "forwards",
        },
      );
    },
    [mobile],
  );
  useLayoutEffect(() => {
    if (!mobile && present && actions.current) {
      const element = actions.current;
      setBelow(element.offsetHeight);
      const observer = new ResizeObserver(() => setBelow(element.offsetHeight));
      observer.observe(element);
      return () => observer.disconnect();
    }
  }, [mobile, present]);
  useEffect(() => {
    if (panelOpen && !mobile) {
      const frame = requestAnimationFrame(() => animateIdentity(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [panelOpen, mobile, animateIdentity]);
  useEffect(() => {
    if (!personaOpen && !present && restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [personaOpen, present, mobile, panelOpen]);
  useEffect(() => {
    const desktop = matchMedia(DESKTOP_QUERY);
    const closeInactive = () => {
      if (mobile ? desktop.matches : !desktop.matches) {
        setPanelOpen(false);
        setPresent(false);
      }
    };
    desktop.addEventListener("change", closeInactive);
    return () => desktop.removeEventListener("change", closeInactive);
  }, [mobile]);
  useEffect(
    () => () => {
      motion.current?.cancel();
    },
    [],
  );
  if (!user) return null;
  function closePanel(returnFocus = true) {
    restoreFocus.current = returnFocus;
    animateIdentity(false);
    setPanelOpen(false);
  }
  function openPersonas() {
    restoreFocus.current = false;
    closePanel(false);
    setPersonaOpen(true);
  }
  function identityContent(compact = false, expanded = false) {
    return (
      <>
        <NotificationAvatar username={user!.username} displayName={user!.displayName} size={36} badge={!expanded} />{" "}
        <span className={styles.details} aria-hidden={compact || undefined}>
          <span className={styles.name}>{user!.displayName}</span>{" "}
          <span className={styles.secondary}>
            @{user!.username} · {roleLabel(user!.role)}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? <ChevronsDownUp size={16} /> : <ChevronsUpDownIcon ref={triggerChevron} size={16} />}
        </span>
      </>
    );
  }
  const accountLabel = accountLabelOf(user, count);
  const settings = (
    <div className={styles.settings}>
      <p className={styles.eyebrow}>Configurações rápidas</p>
      <ThemeControl theme={theme} />
      <p className={styles.language} title="Idioma fixo desta demonstração">
        <span>
          <Languages size={15} aria-hidden="true" />
          Idioma
        </span>
        <span>
          <span>Português (BR)</span>
          <LockKeyhole size={12} aria-hidden="true" />
          <span className="sr-only">Somente leitura</span>
        </span>
      </p>
    </div>
  );
  const notifications = (
    <NotificationMenuButton
      onClick={() => {
        closePanel(false);
        openPanel(trigger.current);
      }}
    />
  );
  const accountActions = (
    <div className={styles.actions} ref={actions}>
      <button type="button" className={`${styles.action} ${styles.logout}`} onClick={signOut}>
        <LogOut size={16} aria-hidden="true" />
        <span>Logout</span>
      </button>
      <div className={styles.separator} role="separator" />
      <div className={styles.demoRow}>
        <button
          type="button"
          className={styles.action}
          ref={demoAction}
          aria-label="Trocar perfil"
          onClick={openPersonas}
        >
          <UsersRound size={16} aria-hidden="true" />
          Trocar perfil
        </button>
        <Tooltip.Root>
          <Tooltip.Trigger
            className={styles.demo}
            aria-label="Sobre o modo Demo"
            aria-describedby={demoDescription}
            delay={200}
            closeOnClick={false}
          >
            Demo
            <Info size={12} aria-hidden="true" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner className={styles.tooltipPositioner} side="top" sideOffset={8} collisionPadding={12}>
              <Tooltip.Popup id={demoDescription} role="tooltip" className={styles.tooltip}>
                A troca de perfil está disponível apenas para demonstração.
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
  return (
    <>
      {mobile ? (
        <Popover.Root
          open={panelOpen}
          modal={false}
          onOpenChange={(next, details) => {
            if (!next) restoreFocus.current = ["escape-key", "trigger-press", "close-press"].includes(details.reason);
            setPanelOpen(next);
          }}
        >
          <Popover.Trigger
            ref={trigger}
            className={styles.avatarTrigger}
            aria-label={`Abrir conta${count ? `: ${badgeCount(count)} · ${notificationCount(count)}` : ""}`}
            title={`Conta de ${user.displayName}`}
          >
            <NotificationAvatar username={user.username} displayName={user.displayName} size={32} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              className={styles.positioner}
              positionMethod="fixed"
              side="bottom"
              align="end"
              sideOffset={6}
              collisionPadding={8}
            >
              <Popover.Popup className={`${styles.floating} ${styles.dropdown}`} finalFocus={false}>
                <Popover.Title className="sr-only">Conta e preferências</Popover.Title>
                <div className={styles.dropdownIdentity}>
                  <NotificationAvatar username={user.username} displayName={user.displayName} size={36} badge={false} />
                  <span className={styles.details}>
                    <span className={styles.name}>{user.displayName}</span>
                    <span className={styles.secondary}>
                      @{user.username} · {roleLabel(user.role)}
                    </span>
                  </span>
                </div>
                {settings}
                {notifications}
                {accountActions}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <Popover.Root
          open={panelOpen}
          modal={false}
          onOpenChange={(next, details) => {
            if (next) {
              setPresent(true);
              restoreFocus.current = false;
            } else {
              restoreFocus.current = ["escape-key", "trigger-press", "close-press"].includes(details.reason);
              animateIdentity(false);
            }
            setPanelOpen(next);
          }}
          onOpenChangeComplete={(next) => {
            if (!next) setPresent(false);
          }}
        >
          <span className={styles.triggerSlot}>
            <Popover.Trigger
              ref={trigger}
              {...chevronEvents(triggerChevron)}
              className={`${styles.card} ${styles.trigger}`}
              data-compact={collapsed}
              data-covered={present}
              aria-label={`Abrir painel da conta: ${accountLabel}`}
              title={`Conta de ${user.displayName}`}
            >
              {identityContent(collapsed)}
            </Popover.Trigger>
          </span>
          <Popover.Portal>
            <Popover.Positioner
              className={styles.positioner}
              positionMethod="fixed"
              sticky
              collisionBoundary={[]}
              side="top"
              align="start"
              sideOffset={({ anchor }) => -(anchor.height + below)}
              collisionPadding={8}
              collisionAvoidance={{ side: "shift", align: "shift" }}
            >
              <Popover.Popup className={styles.floating} finalFocus={false}>
                <Popover.Title className="sr-only">Conta e preferências</Popover.Title>
                {settings}
                {notifications}
                <button
                  ref={identity}
                  type="button"
                  className={`${styles.card} ${styles.identity}`}
                  aria-label={`Fechar painel da conta: ${accountLabel}`}
                  title={`Conta de ${user.displayName} · @${user.username}`}
                  onClick={() => closePanel()}
                >
                  {identityContent(false, true)}
                </button>
                {accountActions}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      <PersonaSwitchDialog
        open={personaOpen}
        onOpenChange={(next) => {
          restoreFocus.current = !next;
          setPersonaOpen(next);
        }}
      />
    </>
  );
}
