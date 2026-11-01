'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ApprovalsScreen } from '@/features/orders/components/approvals-screen';
import { useOrdersData } from '@/features/orders/hooks/use-orders-data';

export default function ApprovalsPage() {
  const [notice, setNotice] = useState('');
  const orders = useOrdersData();

  return (
    <AppShell
      screen="approvals"
      pendingCount={
        orders.orders.filter((order) => order.status === 'PENDING').length
      }
      loading={orders.loading}
      error={orders.error}
      notice={notice}
      onRetry={() => void orders.reload()}
    >
      <ApprovalsScreen
        orders={orders.orders}
        onNotice={setNotice}
        onReload={orders.reload}
      />
    </AppShell>
  );
}
