import { AlertTriangle, ArrowRight, Building2, Info, Layers, Pencil, Plus } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/ListSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserAvatar } from '@/components/UserAvatar'
import { useSites, useUsers } from '@/features/catalog/api'
import { formatBRL } from '@/lib/money'
import type { ApprovalTierWithRange, ConstructionSite, User } from '@/types/api'
import { useTiers } from '../api'
import { DeleteTierButton } from '../components/DeleteTierButton'
import { TierDialog } from '../components/TierDialog'
import { tierRangeLabel } from '../range'

export function TiersPage() {
  const sites = useSites()
  const users = useUsers()
  const [params, setParams] = useSearchParams()

  const header = (
    <PageHeader
      title="Regras de alçada"
      description="Para cada obra, defina faixas de valor e quem aprova os pedidos de cada faixa, em sequência."
    />
  )

  if (sites.isPending || users.isPending) {
    return (
      <>
        {header}
        <ListSkeleton rows={3} />
      </>
    )
  }
  if (sites.isError || users.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={sites.error ?? users.error}
          onRetry={() => {
            void sites.refetch()
            void users.refetch()
          }}
          retrying={sites.isFetching || users.isFetching}
        />
      </>
    )
  }
  if (sites.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Building2}
          title="Nenhuma obra cadastrada"
          description="As regras de alçada são configuradas por obra. Cadastre uma obra para começar (os dados de demonstração podem ser carregados com pnpm db:seed)."
        />
      </>
    )
  }

  // The selected site lives in the URL (?obra=<id>), defaulting to the first one.
  const site = sites.data.find((s) => s.id === params.get('obra')) ?? sites.data[0]

  return (
    <>
      {header}
      <div className="mb-6 max-w-sm space-y-1.5">
        <Label htmlFor="site">Obra</Label>
        <Select value={site.id} onValueChange={(id) => setParams({ obra: id })}>
          <SelectTrigger id="site" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sites.data.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} · {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SiteTiers key={site.id} site={site} users={users.data} />
    </>
  )
}

type DialogState = { open: false } | { open: true; tier?: ApprovalTierWithRange }

function SiteTiers({ site, users }: { site: ConstructionSite; users: User[] }) {
  const tiers = useTiers(site.id)
  const [dialog, setDialog] = useState<DialogState>({ open: false })

  const newTierButton = (
    <Button onClick={() => setDialog({ open: true })} disabled={!tiers.isSuccess}>
      <Plus />
      Nova faixa
    </Button>
  )

  let content
  if (tiers.isPending) {
    content = <ListSkeleton rows={3} />
  } else if (tiers.isError) {
    content = (
      <ErrorState error={tiers.error} onRetry={() => tiers.refetch()} retrying={tiers.isFetching} />
    )
  } else if (tiers.data.length === 0) {
    content = (
      <EmptyState
        icon={Layers}
        title="Nenhuma faixa cadastrada"
        description="Sem regras, pedidos desta obra não podem ser enviados: não há quem aprove. Crie a primeira faixa para liberar os pedidos."
        action={newTierButton}
      />
    )
  } else {
    const last = tiers.data[tiers.data.length - 1]
    content = (
      <div className="space-y-4">
        {last.maxAmount !== null && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle />
            <AlertTitle>Valores acima de {formatBRL(last.maxAmount)} não têm regra</AlertTitle>
            <AlertDescription className="text-amber-900">
              Pedidos com total maior que esse serão bloqueados no cadastro. Para cobri-los, crie
              uma faixa sem limite superior.
            </AlertDescription>
          </Alert>
        )}
        <TiersList
          site={site}
          tiers={tiers.data}
          onEdit={(tier) => setDialog({ open: true, tier })}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faixas de valor</CardTitle>
        <CardDescription>
          {site.code} · {site.name}
        </CardDescription>
        {tiers.isSuccess && tiers.data.length > 0 && <CardAction>{newTierButton}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Alterações valem para novos pedidos. Pedidos já criados mantêm a cadeia definida no
          momento da criação.
        </p>
      </CardContent>
      {tiers.isSuccess && (
        <TierDialog
          site={site}
          tier={dialog.open ? dialog.tier : undefined}
          tiers={tiers.data}
          users={users}
          open={dialog.open}
          onOpenChange={(open) => !open && setDialog({ open: false })}
        />
      )}
    </Card>
  )
}

function Approvers({ tier }: { tier: ApprovalTierWithRange }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Aprovadores em ordem">
      {tier.approvers.map((approver, index) => (
        <Fragment key={approver.userId}>
          {index > 0 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />}
          <li className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-2.5 pl-0.5 text-sm">
            <UserAvatar name={approver.user.name} className="size-6 text-[10px]" />
            {approver.user.name}
          </li>
        </Fragment>
      ))}
    </ol>
  )
}

function TiersList({
  site,
  tiers,
  onEdit,
}: {
  site: ConstructionSite
  tiers: ApprovalTierWithRange[]
  onEdit: (tier: ApprovalTierWithRange) => void
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-64 pl-4">Faixa de valor</TableHead>
              <TableHead>Aprovadores, na ordem do fluxo</TableHead>
              <TableHead className="w-48 pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => {
              const label = tierRangeLabel(tier.minAmount, tier.maxAmount)
              return (
                <TableRow key={tier.id}>
                  <TableCell className="pl-4 font-medium">{label}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Approvers tier={tier} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(tier)}>
                      <Pencil />
                      Editar
                    </Button>
                    <DeleteTierButton siteId={site.id} tierId={tier.id} label={label} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {tiers.map((tier) => {
          const label = tierRangeLabel(tier.minAmount, tier.maxAmount)
          return (
            <li key={tier.id} className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">{label}</p>
              <Approvers tier={tier} />
              <div className="flex justify-end gap-1 border-t pt-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(tier)}>
                  <Pencil />
                  Editar
                </Button>
                <DeleteTierButton siteId={site.id} tierId={tier.id} label={label} />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
