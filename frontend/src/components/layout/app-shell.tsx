'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { Feedback, LoadingState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/layout/page-header';
import { Sidebar } from '@/components/layout/sidebar';
import { Screen } from '@/types/obraflow';

type Props = {
  screen: Screen;
  pendingCount: number;
  loading: boolean;
  error: string;
  notice: string;
  onRetry: () => void;
  children: ReactNode;
};

export function AppShell({
  screen,
  pendingCount,
  loading,
  error,
  notice,
  onRetry,
  children,
}: Props) {
  const router = useRouter();

  return (
    <main className="shell">
      <Sidebar
        screen={screen}
        pendingCount={pendingCount}
        onNavigate={(nextScreen) =>
          router.push(nextScreen === 'new-order' ? '/' : `/${nextScreen}`)
        }
      />
      <section className="content">
        <PageHeader screen={screen} />
        <Feedback error={error} notice={notice} onRetry={onRetry} />
        {loading ? <LoadingState /> : children}
      </section>
    </main>
  );
}
