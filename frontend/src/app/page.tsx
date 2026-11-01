'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { NewOrderForm } from '@/features/orders/components/new-order-form';
import { useOrdersData } from '@/features/orders/hooks/use-orders-data';
import { useSuppliersData } from '@/features/suppliers/hooks/use-suppliers-data';
import { useWorksData } from '@/features/works/hooks/use-works-data';

export default function NewOrderPage() {
  const [selectedWork, setSelectedWork] = useState('');
  const [notice, setNotice] = useState('');
  const works = useWorksData();
  const suppliers = useSuppliersData();
  const orders = useOrdersData();

  useEffect(() => {
    if (!selectedWork && works.works[0])
      setSelectedWork(String(works.works[0].id));
  }, [works.works, selectedWork]);

  const reload = async () => {
    setNotice('');
    await Promise.all([works.reload(), suppliers.reload(), orders.reload()]);
  };

  return (
    <AppShell
      screen="new-order"
      pendingCount={
        orders.orders.filter((order) => order.status === 'PENDING').length
      }
      loading={works.loading || suppliers.loading || orders.loading}
      error={works.error || suppliers.error || orders.error}
      notice={notice}
      onRetry={() => void reload()}
    >
      <NewOrderForm
        works={works.works}
        suppliers={suppliers.suppliers}
        selectedWork={selectedWork}
        onWorkChange={setSelectedWork}
        onSuccess={setNotice}
        onReload={reload}
      />
    </AppShell>
  );
}
