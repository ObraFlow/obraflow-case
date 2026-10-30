import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApprovalRulesView } from '@/features/approval-rules/approval-rules-view';

export const metadata: Metadata = { title: 'Alçadas' };

export default function AlcadasPage() {
  return (
    // Suspense: a obra selecionada vem da URL (useSearchParams).
    <Suspense>
      <ApprovalRulesView />
    </Suspense>
  );
}
