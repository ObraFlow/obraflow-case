import { notFound } from 'next/navigation';
import { AlcadasRules } from '@/components/alcadas/AlcadasRules';
import { getObra, getNiveis, getUsuarios } from '@/lib/api';
import { getServerAuthSession } from '@/lib/auth';

export default async function AlcadasObraPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const session = await getServerAuthSession();
  const accessToken = (session as any)?.accessToken;
  const [obra, niveis, usuarios] = await Promise.all([
    getObra(obraId, accessToken),
    getNiveis(obraId, accessToken),
    getUsuarios(accessToken),
  ]);

  if (!obra) {
    notFound();
  }

  return (
    <AlcadasRules
      obra={obra}
      niveis={niveis}
      usuarios={usuarios}
    />
  );
}