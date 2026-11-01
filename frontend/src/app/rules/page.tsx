'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RulesScreen } from '@/features/rules/components/rules-screen';
import { useApprovalRulesData } from '@/features/rules/hooks/use-approval-rules-data';
import { useOrdersData } from '@/features/orders/hooks/use-orders-data';
import { useUsersData } from '@/features/users/hooks/use-users-data';
import { useWorksData } from '@/features/works/hooks/use-works-data';

export default function RulesPage() {
  const [selectedWork, setSelectedWork] = useState('');
  const [notice, setNotice] = useState('');
  const works = useWorksData();
  const users = useUsersData();
  const orders = useOrdersData();
  const approvalRules = useApprovalRulesData(selectedWork);

  useEffect(() => {
    if (!selectedWork && works.works[0])
      setSelectedWork(String(works.works[0].id));
  }, [works.works, selectedWork]);

  const reload = async () => {
    setNotice('');
    await Promise.all([works.reload(), users.reload(), orders.reload()]);
  };

  return (
    <AppShell
      screen="rules"
      pendingCount={
        orders.orders.filter((order) => order.status === 'PENDING').length
      }
      loading={works.loading || users.loading || orders.loading}
      error={works.error || users.error || orders.error || approvalRules.error}
      notice={notice}
      onRetry={() => void reload()}
    >
      <RulesScreen
        works={works.works}
        users={users.users}
        selectedWork={selectedWork}
        onWorkChange={setSelectedWork}
        rules={approvalRules.rules}
        onNotice={setNotice}
        onReload={approvalRules.reload}
      />
    </AppShell>
  );
}
