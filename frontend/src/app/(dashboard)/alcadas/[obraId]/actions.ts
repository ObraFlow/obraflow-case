'use server';

import { apiFetch } from '@/lib/api';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';

const NivelSchema = z.object({
  obraId: z.string().uuid(),
  limiteInferior: z.number().min(0),
  limiteSuperior: z.number().min(0.01).nullable(),
  descricao: z.string().max(120).optional(),
  usuariosAprovadores: z.array(z.string().uuid()).min(1),
}).refine((data) => {
  if (data.limiteSuperior !== null) {
    return data.limiteSuperior > data.limiteInferior;
  }
  return true;
}, {
  message: 'Limite superior deve ser maior que o limite inferior',
  path: ['limiteSuperior'],
});

async function getToken() {
  const session = await getServerAuthSession();
  return (session as any)?.accessToken;
}

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createNivel(data: z.infer<typeof NivelSchema>): Promise<ActionResult> {
  try {
    const validated = NivelSchema.parse(data);
    const accessToken = await getToken();

    await apiFetch(`/obras/${validated.obraId}/niveis`, {
      method: 'POST',
      body: JSON.stringify(validated),
    }, [], accessToken);

    revalidateTag(`niveis-${validated.obraId}`);
    revalidatePath(`/alcadas/${validated.obraId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao criar faixa de alçada' };
  }
}

export async function updateNivel(nivelId: string, data: z.infer<typeof NivelSchema>): Promise<ActionResult> {
  try {
    const validated = NivelSchema.parse(data);
    const accessToken = await getToken();

    await apiFetch(`/niveis/${nivelId}`, {
      method: 'PUT',
      body: JSON.stringify(validated),
    }, [], accessToken);

    revalidateTag(`niveis-${validated.obraId}`);
    revalidatePath(`/alcadas/${validated.obraId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao atualizar faixa de alçada' };
  }
}

export async function deleteNivel(nivelId: string, obraId: string): Promise<ActionResult> {
  try {
    const accessToken = await getToken();

    await apiFetch(`/niveis/${nivelId}`, {
      method: 'DELETE',
    }, [], accessToken);

    revalidateTag(`niveis-${obraId}`);
    revalidatePath(`/alcadas/${obraId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao excluir faixa de alçada' };
  }
}

export async function simulacaoAlcada(nivelId: string, valor: number): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const accessToken = await getToken();
    const result = await apiFetch(`/niveis/${nivelId}/simulacao?valor=${valor}`, {}, [], accessToken);
    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Erro inesperado ao simular alçada' };
  }
}