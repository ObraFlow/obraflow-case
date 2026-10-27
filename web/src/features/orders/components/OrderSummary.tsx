import type Decimal from 'decimal.js'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { Link } from 'react-router'
import { ApprovalChainInline } from '@/components/ApprovalChain'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL } from '@/lib/money'
import type { ApprovalChainPreview } from '@/types/api'

export type ChainPreviewState =
  | { kind: 'no-site' }
  | { kind: 'no-total' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; preview: ApprovalChainPreview }

interface OrderSummaryProps {
  itemCount: number
  total: Decimal
  chain: ChainPreviewState
  siteLabel?: string
  canSubmit: boolean
  submitting: boolean
  submitError?: string
}

/** Total, the approval chain that will apply, and the submit button. */
export function OrderSummary({
  itemCount,
  total,
  chain,
  siteLabel,
  canSubmit,
  submitting,
  submitError,
}: OrderSummaryProps) {
  const noTier = chain.kind === 'ready' && chain.preview.tier === null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs text-muted-foreground">
            Total do pedido · {itemCount === 1 ? '1 item' : `${itemCount} itens`}
          </p>
          <p className="text-2xl font-semibold tabular-nums" aria-live="polite">
            {formatBRL(total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soma dos totais dos itens; define a regra de alçada.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Cadeia de aprovação prevista</p>
          <ChainPreview chain={chain} siteLabel={siteLabel} total={total} />
        </div>

        {submitError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Não foi possível cadastrar</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit || noTier || submitting}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            {submitting ? 'Cadastrando...' : 'Cadastrar pedido'}
          </Button>
          {!canSubmit && (
            <p className="text-center text-xs text-muted-foreground">
              Preencha os dados gerais e todos os itens para habilitar o cadastro.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ChainPreview({
  chain,
  siteLabel,
  total,
}: {
  chain: ChainPreviewState
  siteLabel?: string
  total: Decimal
}) {
  switch (chain.kind) {
    case 'no-site':
      return (
        <p className="text-sm text-muted-foreground">Selecione a obra para ver quem vai aprovar.</p>
      )
    case 'no-total':
      return (
        <p className="text-sm text-muted-foreground">
          Preencha quantidade e preço dos itens para ver quem vai aprovar.
        </p>
      )
    case 'loading':
      return <Skeleton className="h-6 w-full" />
    case 'unavailable':
      return (
        <p className="text-sm text-muted-foreground">
          Não foi possível prever a cadeia agora. Ela será definida ao cadastrar.
        </p>
      )
    case 'ready': {
      const { tier } = chain.preview
      if (!tier) {
        return (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle />
            <AlertTitle>Nenhuma regra cobre este valor</AlertTitle>
            <AlertDescription className="text-amber-900">
              {siteLabel ?? 'Esta obra'} não tem faixa de alçada para {formatBRL(total)}, então o
              pedido não pode ser enviado.{' '}
              <Link to="/regras-de-alcada" className="font-medium underline">
                Configurar regras de alçada
              </Link>
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <ApprovalChainInline
            steps={tier.approvers.map((approver) => ({
              position: approver.position,
              status: 'WAITING' as const,
              approver: approver.user,
            }))}
          />
          <p className="text-xs text-muted-foreground">
            {tier.maxAmount
              ? `Faixa até ${formatBRL(tier.maxAmount)}`
              : 'Faixa sem limite superior'}{' '}
            · aprovação em sequência
          </p>
        </div>
      )
    }
  }
}
