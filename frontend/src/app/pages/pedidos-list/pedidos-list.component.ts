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
    <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
      <!-- Cabeçalho da Página -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.5rem;">📋</span>
            <h1>Aprovações & Pedidos de Compra</h1>
          </div>
          <p>
            Monitore o fluxo de aprovação das compras e tome decisões conforme a sua alçada de responsabilidade.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a routerLink="/pedidos/novo" class="btn btn-primary">
            <span>+</span> Novo Pedido de Compra
          </a>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <div class="card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: end;">
          <div>
            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Filtrar por Obra</label>
            <select class="form-select" [(ngModel)]="filtroObra" (change)="carregarPedidos()">
              <option value="">Todas as Obras</option>
              <option *ngFor="let obra of obras" [value]="obra.id">{{ obra.nome }}</option>
            </select>
          </div>

          <div>
            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.25rem;">Situação do Pedido</label>
            <select class="form-select" [(ngModel)]="filtroStatus" (change)="carregarPedidos()">
              <option value="">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REJEITADO">Rejeitado</option>
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm" (click)="carregarPedidos()" [disabled]="loading">
              🔄 Atualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Feedback de Erro de Conexão -->
      <app-error-banner
        *ngIf="erro"
        [mensagem]="erro"
        (retry)="carregarPedidos()"
      ></app-error-banner>

      <!-- Loading State Obrigatório -->
      <app-loading-spinner
        *ngIf="loading"
        mensagem="Consultando pedidos de compra e fluxos de alçada..."
      ></app-loading-spinner>

      <!-- Empty State -->
      <app-empty-state
        *ngIf="!loading && !erro && pedidos.length === 0"
        icone="📝"
        titulo="Nenhum pedido de compra encontrado"
        mensagem="Não há pedidos cadastrados para os filtros selecionados. Crie um novo pedido para iniciar a cadeia de alçadas."
        botaoTexto="Cadastrar Primeiro Pedido"
        (acao)="navegarNovoPedido()"
      ></app-empty-state>

      <!-- Tabela / Lista de Pedidos -->
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
                  <strong style="color: var(--primary-600); font-family: monospace;">{{ pedido.numero }}</strong>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--slate-800);">{{ pedido.obra.nome }}</div>
                  <div style="font-size: 0.8rem; color: var(--slate-500);">{{ pedido.fornecedor.razaoSocial }}</div>
                </td>
                <td>
                  <div style="font-size: 0.85rem;">{{ pedido.dataPedido | date:'dd/MM/yyyy' }}</div>
                </td>
                <td>
                  <div style="font-weight: 700; color: var(--slate-900);">
                    {{ pedido.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--slate-500);">
                    {{ pedido.quantidadeItens }} {{ pedido.quantidadeItens === 1 ? 'item' : 'itens' }}
                  </div>
                </td>
                <td>
                  <app-status-badge [status]="pedido.status"></app-status-badge>
                </td>
                <td>
                  <!-- Alçada Atual Context -->
                  <div *ngIf="pedido.status === 'PENDENTE'" style="font-size: 0.85rem;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; color: var(--primary-700); font-weight: 600;">
                      <span>Etapa {{ pedido.nivelAtualOrdem }} de {{ pedido.totalEtapas }}:</span>
                      <span>{{ pedido.aprovadorAtual?.nome || 'Aprovador' }}</span>
                    </div>
                    <div *ngIf="pedido.proximosAprovadores.length > 0" style="font-size: 0.75rem; color: var(--slate-500);">
                      Próximos: {{ pedido.proximosAprovadores.join(' → ') }}
                    </div>
                  </div>

                  <div *ngIf="pedido.status === 'APROVADO'" style="font-size: 0.8rem; color: var(--emerald-700);">
                    ✓ Cadeia concluída ({{ pedido.totalEtapas }} etapas)
                  </div>

                  <div *ngIf="pedido.status === 'REJEITADO'" style="font-size: 0.8rem; color: var(--rose-600);">
                    ✕ Fluxo interrompido
                  </div>
                </td>
                <td style="text-align: right;" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="abrirDetalhes(pedido.id)"
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Drawer Lateral de Detalhes do Pedido -->
      <div *ngIf="pedidoSelecionadoId" class="drawer-overlay" (click)="fecharDetalhes()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <!-- Header do Drawer -->
          <div class="drawer-header">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h3 style="margin: 0;">Pedido {{ pedidoDetalhes?.numero || '...' }}</h3>
                <app-status-badge *ngIf="pedidoDetalhes" [status]="pedidoDetalhes.status"></app-status-badge>
              </div>
              <p style="font-size: 0.825rem; color: var(--slate-500); margin: 0;">
                Criado em {{ pedidoDetalhes?.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <button
              type="button"
              style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--slate-400);"
              (click)="fecharDetalhes()"
            >
              &times;
            </button>
          </div>

          <!-- Loading dos Detalhes -->
          <div *ngIf="loadingDetalhes" style="padding: 3rem 1rem;">
            <app-loading-spinner mensagem="Carregando detalhes do pedido..."></app-loading-spinner>
          </div>

          <!-- Conteúdo do Drawer -->
          <div *ngIf="!loadingDetalhes && pedidoDetalhes" class="drawer-content">
            <!-- Alerta se Rejeitado -->
            <div *ngIf="pedidoDetalhes.status === 'REJEITADO'" class="alert alert-danger">
              <div>
                <strong>Pedido Rejeitado</strong>
                <p style="margin-top: 0.25rem; color: var(--rose-700);">
                  {{ pedidoDetalhes.motivoRejeicao }}
                </p>
              </div>
            </div>

            <!-- Dados Gerais do Pedido -->
            <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Obra</span>
                  <strong style="color: var(--slate-800);">{{ pedidoDetalhes.obra.nome }}</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Fornecedor</span>
                  <strong style="color: var(--slate-800);">{{ pedidoDetalhes.fornecedor.razaoSocial }}</strong>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Data de Emissão</span>
                  <span>{{ pedidoDetalhes.dataPedido | date:'dd/MM/yyyy' }}</span>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Valor Total</span>
                  <strong style="font-size: 1.1rem; color: var(--primary-700);">
                    {{ pedidoDetalhes.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </strong>
                </div>
              </div>
              <div *ngIf="pedidoDetalhes.observacoes" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--slate-200);">
                <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Observações Internas</span>
                <span style="font-size: 0.85rem; color: var(--slate-700);">{{ pedidoDetalhes.observacoes }}</span>
              </div>
            </div>

            <!-- Cadeia de Alçada (Stepper) -->
            <div style="margin-bottom: 2rem;">
              <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>⚖️</span> Cadeia de Aprovação (Alçadas)
              </h3>
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
                    <span *ngIf="etapa.status === 'APROVADO'">✓</span>
                    <span *ngIf="etapa.status === 'REJEITADO'">✕</span>
                    <span *ngIf="etapa.status === 'PENDENTE'">{{ etapa.ordem }}</span>
                  </div>
                  <div class="step-content">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <strong style="color: var(--slate-800); font-size: 0.925rem;">
                        {{ etapa.usuario.nome }}
                      </strong>
                      <span style="font-size: 0.75rem; color: var(--slate-500);">
                        {{ etapa.usuario.cargo }}
                      </span>
                    </div>

                    <div style="margin-top: 0.25rem;">
                      <app-status-badge [status]="etapa.status"></app-status-badge>
                      <span *ngIf="etapa.decididoEm" style="font-size: 0.78rem; color: var(--slate-500); margin-left: 0.5rem;">
                        em {{ etapa.decididoEm | date:'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>

                    <p *ngIf="etapa.motivo" style="margin-top: 0.4rem; font-size: 0.825rem; background: var(--slate-50); padding: 0.4rem 0.6rem; border-radius: 0.35rem; border-left: 3px solid var(--slate-300);">
                      "{{ etapa.motivo }}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabela de Itens do Pedido -->
            <div style="margin-bottom: 2rem;">
              <h3 style="margin-bottom: 0.75rem;">Itens do Pedido ({{ pedidoDetalhes.itens.length }})</h3>
              <div class="table-responsive" style="border: 1px solid var(--slate-200); border-radius: 0.5rem;">
                <table class="table" style="font-size: 0.825rem;">
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
                      <td><strong>{{ item.descricao }}</strong></td>
                      <td>{{ item.quantidade }}</td>
                      <td>{{ item.unidade }}</td>
                      <td>{{ item.precoUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                      <td style="text-align: right; font-weight: 600;">
                        {{ item.totalItem | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style="background: var(--slate-50); font-weight: 700;">
                      <td colspan="4" style="text-align: right;">Valor Total do Pedido:</td>
                      <td style="text-align: right; color: var(--primary-700);">
                        {{ pedidoDetalhes.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Trilha de Histórico e Auditoria -->
            <div>
              <h3 style="margin-bottom: 0.75rem;">Histórico & Trilha de Auditoria</h3>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div
                  *ngFor="let hist of pedidoDetalhes.historico"
                  style="padding: 0.65rem 0.85rem; border-radius: 0.4rem; background: var(--slate-50); border: 1px solid var(--slate-200); font-size: 0.8rem;"
                >
                  <div style="display: flex; justify-content: space-between; color: var(--slate-500); margin-bottom: 0.2rem;">
                    <strong>{{ hist.acao }}</strong>
                    <span>{{ hist.criadoEm | date:'dd/MM/yyyy HH:mm:ss' }}</span>
                  </div>
                  <div style="color: var(--slate-700);">{{ hist.descricao }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer do Drawer com Ações de Aprovação -->
          <div *ngIf="!loadingDetalhes && pedidoDetalhes" class="drawer-footer">
            <button type="button" class="btn btn-secondary" (click)="fecharDetalhes()">
              Fechar
            </button>

            <!-- Casos onde a cadeia já foi concluída -->
            <div *ngIf="pedidoDetalhes.status !== 'PENDENTE'" style="display: flex; align-items: center; gap: 0.5rem;">
              <button type="button" class="btn btn-secondary" disabled title="Cadeia de alçada já concluída">
                Cadeia de Alçada Finalizada ({{ pedidoDetalhes.status }})
              </button>
            </div>

            <!-- Casos onde o pedido está pendente -->
            <ng-container *ngIf="pedidoDetalhes.status === 'PENDENTE'">
              <!-- Validação de permissão do usuário atual -->
              <div *ngIf="!podeDecidir" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.825rem; color: var(--slate-500);">
                <span>🔒 Apenas <strong>{{ pedidoDetalhes.aprovadorAtual?.nome }}</strong> pode aprovar esta etapa.</span>
              </div>

              <div *ngIf="podeDecidir" style="display: flex; gap: 0.5rem;">
                <button
                  type="button"
                  class="btn btn-danger"
                  (click)="abrirModalRejeicao()"
                  [disabled]="processandoDecisao"
                >
                  ✕ Rejeitar Pedido
                </button>
                <button
                  type="button"
                  class="btn btn-success"
                  (click)="aprovarPedido()"
                  [disabled]="processandoDecisao"
                >
                  <span *ngIf="processandoDecisao" class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></span>
                  ✓ Aprovar Etapa
                </button>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Modal de Rejeição Obrigatório -->
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

