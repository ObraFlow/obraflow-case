'use client';

import { useEffect, useState } from 'react';
import { Screen } from '@/types/obraflow';

const titles: Record<Screen, string> = {
  'new-order': 'Novo pedido de compra',
  approvals: 'Aprovações',
  rules: 'Regras da alçada',
};

export function PageHeader({ screen }: { screen: Screen }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
        .format(new Date())
        .toUpperCase(),
    );
  }, []);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{currentDate}</p>
        <h1>{titles[screen]}</h1>
      </div>
    </header>
  );
}
