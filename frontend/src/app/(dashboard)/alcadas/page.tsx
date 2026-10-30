import { Metadata } from 'next';
import { AlcadasSelector } from '@/components/alcadas/AlcadasSelector';
import { getObras } from '@/lib/api';
import { getServerAuthSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Regras de Alçada - ObraFlow',
  description: 'Gerencie as regras de alçada de aprovação por obra',
};

export default async function AlcadasPage() {
  const session = await getServerAuthSession();
  const accessToken = (session as any)?.accessToken;
  const obras = await getObras(accessToken);

  return <AlcadasSelector obras={obras} />;
}