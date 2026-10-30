'use server';

import { apiFetch } from '@/lib/api';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';

const DecisionSchema = z.object({
  decisao: z.enum(['APROVADO', 'REJEITADO']),
  motivo: z.string().max(500).optional(),
});

async function getToken() {
  const session = await getServerAuthSession();
  return (session as any)?.accessToken;
}

type ActionResult = { ok: true } | { ok: false; error: string };

export async function approvePedido(id: string): Promise<ActionResult> {
  try {
    const validated = DecisionSchema.parse({ decisao: 'APROVADO' });
    const accessToken = await getToken();

    await apiFetch(`/pedidos/${id}/decisoes`, {
      method: 'POST',
      body: JSON.stringify(validated),
    }, [], accessToken);

    revalidateTag('pedidos');
    revalidateTag(`pedido-${id}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao aprovar pedido' };
  }
}

export async function rejectPedido(id: string, motivo: string): Promise<ActionResult> {
  try {
    const validated = DecisionSchema.parse({ decisao: 'REJEITADO', motivo });
    const accessToken = await getToken();

    await apiFetch(`/pedidos/${id}/decisoes`, {
      method: 'POST',
      body: JSON.stringify(validated),
    }, [], accessToken);

    revalidateTag('pedidos');
    revalidateTag(`pedido-${id}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao rejeitar pedido' };
  }
}