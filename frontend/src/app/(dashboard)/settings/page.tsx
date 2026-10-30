import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Configurações - ObraFlow',
  description: 'Configurações de conta e perfil',
};

export default async function SettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect('/login');
  }

  const user = (session as any).user;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Configurações</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Gerencie sua conta e preferências
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="card-base p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Perfil</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-400 font-medium">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Papel:</span>
              <span className="font-medium text-primary-600 dark:text-primary-400 capitalize">
                {(user?.roles?.[0] || 'usuario')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
