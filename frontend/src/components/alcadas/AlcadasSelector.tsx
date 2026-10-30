'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building2, ArrowRight } from 'lucide-react';
import { ObraResultado } from '@/lib/api';

export function AlcadasSelector({ obras }: { obras: ObraResultado[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Regras de Alçada</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Configure as faixas de valor e aprovadores por obra
          </p>
        </div>
      </div>

      {/* Obra Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            <CardTitle>Selecione uma Obra</CardTitle>
          </div>
          <CardDescription>
            Escolha a obra para gerenciar suas regras de alçada de aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {obras.map((obra) => (
              <Link
                key={obra.id}
                href={`/alcadas/${obra.id}`}
                className="group"
              >
                <div className="card-base p-4 transition-all hover:border-primary-300 dark:hover:border-primary-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30">
                          {obra.codigo}
                        </span>
                        {obra.status === 'ATIVA' && (
                          <span className="text-xs font-medium text-success-600 dark:text-success-400 px-2 py-0.5 rounded-full bg-success-50 dark:bg-success-900/30">
                            Ativa
                          </span>
                        )}
                        {obra.status === 'INATIVA' && (
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                            Inativa
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {obra.nome}
                      </h3>
                      {obra.endereco && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-1">
                          {obra.endereco}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-600 transition-colors shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {obras.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400">
                Nenhuma obra cadastrada. Cadastre uma obra para começar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}