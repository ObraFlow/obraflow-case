'use client';

import { Screen } from '@/types/obraflow';

type Props = {
  screen: Screen;
  pendingCount: number;
  onNavigate: (screen: Screen) => void;
};

export function Sidebar({ screen, pendingCount, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">O</span>
        <span>
          Obra<span>Flow</span>
        </span>
      </div>
      <div className="workspace">
        <span className="avatar">LS</span>
        <div>
          <strong>Lucas Soares</strong>
          <small>Minha conta</small>
        </div>
        <span className="chevron">⌄</span>
      </div>
      <p className="nav-label">GESTÃO</p>
      <NavButton
        active={screen === 'new-order'}
        onClick={() => onNavigate('new-order')}
        icon="＋"
      >
        Novo pedido
      </NavButton>
      <NavButton
        active={screen === 'approvals'}
        onClick={() => onNavigate('approvals')}
        icon="◎"
        count={pendingCount}
      >
        Aprovações
      </NavButton>
      <NavButton
        active={screen === 'rules'}
        onClick={() => onNavigate('rules')}
        icon="⌘"
      >
        Regras de alçada
      </NavButton>
      <div className="sidebar-bottom">
        <div className="help">?</div>
        <span>Central de ajuda</span>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  count?: number;
  children: string;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{icon}</span>
      {children}
      <b>{count || ''}</b>
    </button>
  );
}
