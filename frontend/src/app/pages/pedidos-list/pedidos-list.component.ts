import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import {
  Obra,
  PedidoDetalhes,
  PedidoResumo,
  PedidoStatus,
} from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner.component';
import { ModalRejeicaoComponent } from '../../shared/components/modal-rejeicao.component';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
    ModalRejeicaoComponent,
  ],
  template: `
    <div class="container" style="padding-top: 1.5rem; padding-bottom: 3rem;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h1>Pedidos de Compra</h1>
          <p style="margin-top: 0.2rem;">Acompanhamento e aprovação de alçadas financeiras.</p>
        </div>
        <div>
          <a routerLink="/pedidos/novo" class="btn btn-primary">
            Novo Pedido
          </a>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom: 1rem; padding: 0.85rem 1rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; align-items: end;">
          <div>
            <label class="form-label" style="font-size: 0.75rem;">Obra</label>
            <select class="form-select form-control-sm" [(ngModel)]="filtroObra" (change)="carregarPedidos(true)">
              <option value="">Todas as Obras</option>
              <option *ngFor="let obra of obras" [value]="obra.id">{{ obra.nome }}</option>
            </select>
          </div>

          <div>
            <label class="form-label" style="font-size: 0.75rem;">Situação</label>
            <select class="form-select form-control-sm" [(ngModel)]="filtroStatus" (change)="carregarPedidos(true)">
              <option value="">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REJEITADO">Rejeitado</option>
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" (click)="carregarPedidos(true)" [disabled]="loading">
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <app-error-banner
        *ngIf="erro"
        [mensagem]="erro"
        (retry)="carregarPedidos(true)"
      ></app-error-banner>

      <!-- Loading State -->
      <app-loading-spinner
        *ngIf="loading"
        mensagem="Carregando pedidos de compra..."
      ></app-loading-spinner>

      <!-- Empty State -->
      <app-empty-state
        *ngIf="!loading && !erro && pedidos.length === 0"
        titulo="Nenhum pedido encontrado"
        mensagem="Não há pedidos registrados para os filtros selecionados."
        botaoTexto="Novo Pedido"
        (acao)="navegarNovoPedido()"
      ></app-empty-state>

      <!-- Orders Table -->
      <div *ngIf="!loading && !erro && pedidos.length > 0" class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Obra / Fornecedor</th>
                <th>Data</th>
                <th>Itens / Total</th>
                <th>Situação</th>
                <th>Alçada Atual</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pedido of pedidos" style="cursor: pointer;" (click)="abrirDetalhes(pedido.id)">
                <td>
                  <span style="font-weight: 600; color: var(--primary-700); font-family: monospace;">{{ pedido.numero }}</span>
                </td>
                <td>
                  <div style="font-weight: 500; color: var(--slate-800);">{{ pedido.obra.nome }}</div>
                  <div style="font-size: 0.78rem; color: var(--slate-500);">{{ pedido.fornecedor.razaoSocial }}</div>
                </td>
                <td>
                  <span style="font-size: 0.8rem;">{{ pedido.dataPedido | date:'dd/MM/yyyy' }}</span>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--slate-900);">
                    {{ pedido.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--slate-500);">
                    {{ pedido.quantidadeItens }} {{ pedido.quantidadeItens === 1 ? 'item' : 'itens' }}
                  </div>
                </td>
                <td>
                  <app-status-badge [status]="pedido.status"></app-status-badge>
                </td>
                <td>
                  <div *ngIf="pedido.status === 'PENDENTE'" style="font-size: 0.8rem;">
                    <div style="color: var(--primary-700); font-weight: 600;">
                      Etapa {{ pedido.nivelAtualOrdem }}/{{ pedido.totalEtapas }}: {{ pedido.aprovadorAtual?.nome || 'Aprovador' }}
                    </div>
                    <div *ngIf="pedido.proximosAprovadores.length > 0" style="font-size: 0.75rem; color: var(--slate-500);">
                      Próximos: {{ pedido.proximosAprovadores.join(' → ') }}
                    </div>
                  </div>

                  <div *ngIf="pedido.status === 'APROVADO'" style="font-size: 0.78rem; color: var(--emerald-700);">
                    Concluído ({{ pedido.totalEtapas }} etapas)
                  </div>

                  <div *ngIf="pedido.status === 'REJEITADO'" style="font-size: 0.78rem; color: var(--rose-600);">
                    Interrompido
                  </div>
                </td>
                <td style="text-align: right;" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="abrirDetalhes(pedido.id)"
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Drawer Lateral de Detalhes -->
      <div *ngIf="pedidoSelecionadoId" class="drawer-overlay" (click)="fecharDetalhes()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="drawer-header">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h3 style="margin: 0;">Pedido {{ pedidoDetalhes?.numero || '...' }}</h3>
                <app-status-badge *ngIf="pedidoDetalhes" [status]="pedidoDetalhes.status"></app-status-badge>
              </div>
              <p style="font-size: 0.78rem; color: var(--slate-500); margin: 0;">
                Emitido em {{ pedidoDetalhes?.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <button
              type="button"
              style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--slate-400);"
              (click)="fecharDetalhes()"
            >
              &times;
            </button>
          </div>

          <!-- Loading -->
          <div *ngIf="loadingDetalhes" style="padding: 2.5rem 1rem;">
            <app-loading-spinner mensagem="Carregando detalhes..."></app-loading-spinner>
          </div>

          <!-- Content -->
          <div *ngIf="!loadingDetalhes && pedidoDetalhes" class="drawer-content">
            <!-- Alerta se Rejeitado -->
            <div *ngIf="pedidoDetalhes.status === 'REJEITADO'" class="alert alert-danger">
              <div>
                <strong>Pedido Rejeitado</strong>
                <p style="margin-top: 0.2rem; color: var(--rose-700);">
                  {{ pedidoDetalhes.motivoRejeicao }}
                </p>
              </div>
            </div>

            <!-- Dados Gerais -->
            <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 0.375rem; padding: 0.85rem; margin-bottom: 1.25rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Obra</span>
                  <strong style="color: var(--slate-800); font-size: 0.85rem;">{{ pedidoDetalhes.obra.nome }}</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Fornecedor</span>
                  <strong style="color: var(--slate-800); font-size: 0.85rem;">{{ pedidoDetalhes.fornecedor.razaoSocial }}</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Data de Emissão</span>
                  <span style="font-size: 0.85rem;">{{ pedidoDetalhes.dataPedido | date:'dd/MM/yyyy' }}</span>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Valor Total</span>
                  <strong style="font-size: 1rem; color: var(--primary-700);">
                    {{ pedidoDetalhes.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </strong>
                </div>
              </div>
              <div *ngIf="pedidoDetalhes.observacoes" style="margin-top: 0.65rem; padding-top: 0.65rem; border-top: 1px solid var(--slate-200);">
                <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Observações</span>
                <span style="font-size: 0.825rem; color: var(--slate-700);">{{ pedidoDetalhes.observacoes }}</span>
              </div>
            </div>

            <!-- Stepper da Cadeia de Alçada -->
            <div style="margin-bottom: 1.5rem;">
              <h3 style="margin-bottom: 0.85rem; font-size: 0.9rem;">Cadeia de Aprovação</h3>
              <div class="stepper">
                <div
                  *ngFor="let etapa of pedidoDetalhes.aprovacoes"
                  class="step-item"
                  [ngClass]="{
                    'is-done': etapa.status === 'APROVADO',
                    'is-rejected': etapa.status === 'REJEITADO'
                  }"
                >
                  <div
                    class="step-icon"
                    [ngClass]="{
                      'done': etapa.status === 'APROVADO',
                      'rejected': etapa.status === 'REJEITADO',
                      'current': pedidoDetalhes.status === 'PENDENTE' && etapa.ordem === pedidoDetalhes.nivelAtualOrdem,
                      'pending': etapa.status === 'PENDENTE' && etapa.ordem !== pedidoDetalhes.nivelAtualOrdem
                    }"
                  >
                    <span>{{ etapa.ordem }}</span>
                  </div>
                  <div class="step-content">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <strong style="color: var(--slate-800); font-size: 0.85rem;">
                        {{ etapa.usuario.nome }}
                      </strong>
                      <span style="font-size: 0.75rem; color: var(--slate-500);">
                        {{ etapa.usuario.cargo }}
                      </span>
                    </div>

                    <div style="margin-top: 0.25rem;">
                      <app-status-badge [status]="etapa.status"></app-status-badge>
                      <span *ngIf="etapa.decididoEm" style="font-size: 0.75rem; color: var(--slate-500); margin-left: 0.4rem;">
                        {{ etapa.decididoEm | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>

                    <p *ngIf="etapa.motivo" style="margin-top: 0.35rem; font-size: 0.8rem; background: var(--slate-50); padding: 0.35rem 0.5rem; border-radius: 0.25rem; border-left: 2px solid var(--slate-300);">
                      "{{ etapa.motivo }}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Itens do Pedido -->
            <div style="margin-bottom: 1.5rem;">
              <h3 style="margin-bottom: 0.65rem; font-size: 0.9rem;">Itens do Pedido ({{ pedidoDetalhes.itens.length }})</h3>
              <div class="table-responsive" style="border: 1px solid var(--slate-200); border-radius: 0.375rem;">
                <table class="table" style="font-size: 0.8rem;">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtd</th>
                      <th>Un</th>
                      <th>Preço Unit.</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of pedidoDetalhes.itens">
                      <td><span style="font-weight: 500;">{{ item.descricao }}</span></td>
                      <td>{{ item.quantidade }}</td>
                      <td>{{ item.unidade }}</td>
                      <td>{{ item.precoUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                      <td style="text-align: right; font-weight: 600;">
                        {{ item.totalItem | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style="background: var(--slate-50); font-weight: 600;">
                      <td colspan="4" style="text-align: right;">Total:</td>
                      <td style="text-align: right; color: var(--primary-700);">
                        {{ pedidoDetalhes.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Histórico -->
            <div>
              <h3 style="margin-bottom: 0.65rem; font-size: 0.9rem;">Histórico</h3>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                <div
                  *ngFor="let hist of pedidoDetalhes.historico"
                  style="padding: 0.5rem 0.75rem; border-radius: 0.25rem; background: var(--slate-50); border: 1px solid var(--slate-200); font-size: 0.78rem;"
                >
                  <div style="display: flex; justify-content: space-between; color: var(--slate-500); margin-bottom: 0.15rem;">
                    <strong>{{ hist.acao }}</strong>
                    <span>{{ hist.criadoEm | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div style="color: var(--slate-700);">{{ hist.descricao }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Drawer Footer -->
          <div *ngIf="!loadingDetalhes && pedidoDetalhes" class="drawer-footer">
            <button type="button" class="btn btn-secondary btn-sm" (click)="fecharDetalhes()">
              Fechar
            </button>

            <!-- Concluído -->
            <div *ngIf="pedidoDetalhes.status !== 'PENDENTE'" style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.8rem; color: var(--slate-500);">
                Alçada finalizada ({{ pedidoDetalhes.status }})
              </span>
            </div>

            <!-- Pendente -->
            <ng-container *ngIf="pedidoDetalhes.status === 'PENDENTE'">
              <div *ngIf="!podeDecidir" style="font-size: 0.8rem; color: var(--slate-500); display: flex; align-items: center;">
                Aguardando aprovação de {{ pedidoDetalhes.aprovadorAtual?.nome }}
              </div>

              <div *ngIf="podeDecidir" style="display: flex; gap: 0.5rem;">
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  (click)="abrirModalRejeicao()"
                  [disabled]="processandoDecisao"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  class="btn btn-success btn-sm"
                  (click)="aprovarPedido()"
                  [disabled]="processandoDecisao"
                >
                  <span *ngIf="processandoDecisao" class="spinner" style="width: 0.85rem; height: 0.85rem; border-width: 2px;"></span>
                  Aprovar Etapa
                </button>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <app-modal-rejeicao
        *ngIf="exibindoModalRejeicao"
        [loading]="processandoDecisao"
        (fechar)="fecharModalRejeicao()"
        (confirmar)="confirmarRejeicao($event)"
      ></app-modal-rejeicao>
    </div>
  `,
})
export class PedidosListComponent implements OnInit {
  pedidos: PedidoResumo[] = [];
  obras: Obra[] = [];
  filtroObra: string = '';
  filtroStatus: string = '';

  loading: boolean = true;
  erro: string | null = null;

  // Drawer de Detalhes
  pedidoSelecionadoId: string | null = null;
  pedidoDetalhes: PedidoDetalhes | null = null;
  loadingDetalhes: boolean = false;
  processandoDecisao: boolean = false;

  // Modal de Rejeição
  exibindoModalRejeicao: boolean = false;

  constructor(
    private readonly api: ApiService,
    readonly session: SessionService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.carregarObras();
    this.carregarPedidos(true);
  }

  get podeDecidir(): boolean {
    if (!this.pedidoDetalhes || this.pedidoDetalhes.status !== 'PENDENTE') {
      return false;
    }
    const usuarioLogado = this.session.usuarioAtivo();
    if (!usuarioLogado || !this.pedidoDetalhes.aprovadorAtual) {
      return false;
    }
    return usuarioLogado.id === this.pedidoDetalhes.aprovadorAtual.id;
  }

  carregarObras() {
    this.api.getObras().subscribe({
      next: (dados) => (this.obras = dados),
      error: () => {},
    });
  }

  carregarPedidos(forcarLoadingCompleto: boolean = false) {
    if (this.pedidos.length === 0 || forcarLoadingCompleto) {
      this.loading = true;
    }
    this.erro = null;

    this.api
      .getPedidos({
        obraId: this.filtroObra || undefined,
        status: this.filtroStatus || undefined,
      })
      .subscribe({
        next: (dados) => {
          this.pedidos = dados;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.erro =
            err.error?.message ||
            'Não foi possível carregar a lista de pedidos. Verifique se o backend está ativo.';
        },
      });
  }

  abrirDetalhes(id: string) {
    this.pedidoSelecionadoId = id;
    this.loadingDetalhes = true;

    this.api.getPedidoById(id).subscribe({
      next: (dados) => {
        this.pedidoDetalhes = dados;
        this.loadingDetalhes = false;
      },
      error: (err) => {
        this.loadingDetalhes = false;
        alert(
          err.error?.message || 'Erro ao carregar os detalhes do pedido.',
        );
      },
    });
  }

  fecharDetalhes() {
    this.pedidoSelecionadoId = null;
    this.pedidoDetalhes = null;
  }

  aprovarPedido() {
    if (!this.pedidoDetalhes) return;
    const usuarioLogado = this.session.usuarioAtivo();
    if (!usuarioLogado) {
      alert('Selecione um usuário no menu superior para simular a aprovação.');
      return;
    }

    this.processandoDecisao = true;
    this.api
      .aprovarPedido(this.pedidoDetalhes.id, {
        usuarioId: usuarioLogado.id,
      })
      .subscribe({
        next: (atualizado) => {
          this.processandoDecisao = false;
          this.abrirDetalhes(this.pedidoDetalhes!.id);
          this.carregarPedidos(false);
        },
        error: (err) => {
          this.processandoDecisao = false;
          alert(err.error?.message || 'Erro ao aprovar a etapa do pedido.');
        },
      });
  }

  abrirModalRejeicao() {
    this.exibindoModalRejeicao = true;
  }

  fecharModalRejeicao() {
    this.exibindoModalRejeicao = false;
  }

  confirmarRejeicao(motivo: string) {
    if (!this.pedidoDetalhes) return;
    const usuarioLogado = this.session.usuarioAtivo();
    if (!usuarioLogado) {
      alert('Selecione um usuário no menu superior para realizar a rejeição.');
      return;
    }

    this.processandoDecisao = true;
    this.api
      .rejeitarPedido(this.pedidoDetalhes.id, {
        usuarioId: usuarioLogado.id,
        motivo,
      })
      .subscribe({
        next: () => {
          this.processandoDecisao = false;
          this.fecharModalRejeicao();
          this.abrirDetalhes(this.pedidoDetalhes!.id);
          this.carregarPedidos(false);
        },
        error: (err) => {
          this.processandoDecisao = false;
          alert(err.error?.message || 'Erro ao registrar a rejeição.');
        },
      });
  }

  navegarNovoPedido() {
    this.router.navigate(['/pedidos/novo']);
  }
}

