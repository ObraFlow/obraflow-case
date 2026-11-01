import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Obra, RegraAlcada, Usuario } from '../../core/models/models';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner.component';

@Component({
  selector: 'app-regras-alcada',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
  ],
  template: `
    <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.5rem;">⚖️</span>
            <h1>Configuração de Regras de Alçada</h1>
          </div>
          <p>
            Defina faixas financeiras e a cadeia sequencial de aprovadores por obra no serviço Dokimos.
          </p>
        </div>
        <button
          *ngIf="obraSelecionadaId && !exibindoFormulario"
          type="button"
          class="btn btn-primary"
          (click)="iniciarNovaRegra()"
        >
          <span>+</span> Nova Faixa de Alçada
        </button>
      </div>

      <!-- Seletor de Obra -->
      <div class="card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
        <label class="form-label" style="font-size: 0.85rem;">Selecione a Obra para Visualizar e Gerenciar as Regras:</label>
        <div style="display: flex; gap: 1rem; align-items: center; max-width: 480px;">
          <select
            class="form-select"
            [(ngModel)]="obraSelecionadaId"
            (change)="carregarRegrasObra()"
          >
            <option value="">Selecione uma obra...</option>
            <option *ngFor="let obra of obras" [value]="obra.id">{{ obra.nome }}</option>
          </select>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="carregarRegrasObra()"
            [disabled]="!obraSelecionadaId || loadingRegras"
          >
            🔄 Recarregar
          </button>
        </div>
      </div>

      <!-- Banner Informativo sobre Regra de Alçada -->
      <div class="alert alert-info">
        <div>
          <strong>Como funciona a alçada Dokimos:</strong> O sistema identifica a faixa de valor compatível com o total do pedido. A aprovação ocorre de forma <strong>estritamente sequencial</strong> (da etapa 1 até a última). Qualquer rejeição encerra o fluxo e grava o motivo obrigatório.
        </div>
      </div>

      <!-- Loading State -->
      <app-loading-spinner
        *ngIf="loadingRegras"
        mensagem="Buscando faixas de alçada e aprovadores da obra..."
      ></app-loading-spinner>

      <!-- Erro -->
      <app-error-banner
        *ngIf="erro"
        [mensagem]="erro"
        (retry)="carregarRegrasObra()"
      ></app-error-banner>

      <!-- Empty State se nenhuma obra selecionada -->
      <app-empty-state
        *ngIf="!obraSelecionadaId && !loadingRegras"
        icone="🏗️"
        titulo="Selecione uma obra"
        mensagem="Escolha uma obra no seletor acima para visualizar, editar ou cadastrar suas regras de aprovação."
      ></app-empty-state>

      <!-- Empty State se obra não tem regras cadastradas -->
      <app-empty-state
        *ngIf="obraSelecionadaId && !loadingRegras && !erro && regras.length === 0 && !exibindoFormulario"
        icone="⚖️"
        titulo="Nenhuma regra cadastrada para esta obra"
        mensagem="Pedidos criados nesta obra serão bloqueados até que ao menos uma regra de alçada seja configurada."
        botaoTexto="Cadastrar Primeira Regra"
        (acao)="iniciarNovaRegra()"
      ></app-empty-state>

      <!-- Formulário de Criação / Edição de Regra -->
      <div *ngIf="exibindoFormulario" class="card" style="margin-bottom: 2rem; border-color: var(--primary-500); box-shadow: 0 4px 12px rgba(2, 132, 199, 0.1);">
        <div class="card-header" style="background: var(--primary-50);">
          <h3 style="color: var(--primary-700);">
            {{ editandoRegraId ? 'Editar Faixa de Alçada' : 'Nova Faixa de Alçada' }}
          </h3>
          <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()">
            Cancelar
          </button>
        </div>
        <div class="card-body">
          <div *ngIf="erroFormulario" class="alert alert-danger">
            {{ erroFormulario }}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <!-- Descrição -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Descrição da Faixa</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="formRegra.descricao"
                placeholder="Ex: Até R$ 10.000,00 ou Diretoria Geral"
              />
            </div>

            <!-- Valor Mínimo -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Valor Mínimo (R$) <span class="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                [(ngModel)]="formRegra.valorMinimo"
              />
            </div>

            <!-- Valor Máximo -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">
                Valor Máximo (R$)
                <small style="color: var(--slate-500); font-weight: normal;">(deixe vazio para sem limite)</small>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                [(ngModel)]="formRegra.valorMaximo"
                placeholder="Ex: 10000 (ou vazio se acima de...)"
              />
            </div>
          </div>

          <!-- Cadeia de Aprovadores Ordenados -->
          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--slate-200);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div>
                <strong style="color: var(--slate-800);">Aprovadores na Ordem do Fluxo</strong>
                <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0;">
                  A ordem define a sequência obrigatória de aprovação. O aprovador do nível 2 só decide após o nível 1 aprovar.
                </p>
              </div>
            </div>

            <!-- Lista de Aprovadores da Regra -->
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
              <div
                *ngFor="let aprovador of formRegra.aprovadores; let idx = index"
                style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 0.5rem;"
              >
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="badge" style="background: var(--slate-200); color: var(--slate-700); font-size: 0.8rem; width: 1.75rem; height: 1.75rem; justify-content: center; padding: 0;">
                    {{ idx + 1 }}º
                  </span>
                  <div>
                    <strong style="font-size: 0.9rem;">{{ getNomeUsuario(aprovador.usuarioId) }}</strong>
                    <div style="font-size: 0.75rem; color: var(--slate-500);">
                      {{ getCargoUsuario(aprovador.usuarioId) }}
                    </div>
                  </div>
                </div>

                <!-- Botões de Reordenação e Remoção -->
                <div style="display: flex; gap: 0.25rem;">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="padding: 0.2rem 0.5rem;"
                    [disabled]="idx === 0"
                    (click)="moverAprovador(idx, -1)"
                    title="Mover para etapa anterior"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="padding: 0.2rem 0.5rem;"
                    [disabled]="idx === formRegra.aprovadores.length - 1"
                    (click)="moverAprovador(idx, 1)"
                    title="Mover para próxima etapa"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="color: var(--rose-600); padding: 0.2rem 0.5rem;"
                    (click)="removerAprovadorDaRegra(idx)"
                    title="Remover aprovador"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Adicionar Novo Aprovador à Lista -->
            <div style="display: flex; gap: 0.75rem; align-items: center; background: #ffffff; padding: 0.75rem; border: 1px dashed var(--slate-300); border-radius: 0.5rem; max-width: 520px;">
              <select class="form-select form-select-sm" [(ngModel)]="novoUsuarioId">
                <option value="">Selecione um usuário para adicionar...</option>
                <option *ngFor="let u of usuariosDisponiveis" [value]="u.id">
                  {{ u.nome }} — {{ u.cargo }}
                </option>
              </select>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                [disabled]="!novoUsuarioId"
                (click)="adicionarAprovadorNaRegra()"
              >
                + Adicionar
              </button>
            </div>
          </div>

          <!-- Ações do Formulário -->
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--slate-200);">
            <button type="button" class="btn btn-secondary" (click)="cancelarFormulario()" [disabled]="salvando">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" (click)="salvarRegra()" [disabled]="salvando">
              <span *ngIf="salvando" class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></span>
              Salvar Regra de Alçada
            </button>
          </div>
        </div>
      </div>

      <!-- Tabela de Regras Existentes -->
      <div *ngIf="obraSelecionadaId && !loadingRegras && regras.length > 0" class="card">
        <div class="card-header">
          <h3>Faixas de Alçada Configuradas ({{ regras.length }})</h3>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="min-width: 180px;">Faixa de Valor</th>
                <th style="min-width: 220px;">Descrição</th>
                <th style="min-width: 320px;">Aprovadores, na Ordem do Fluxo</th>
                <th style="text-align: right; width: 140px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let regra of regras">
                <td>
                  <strong style="color: var(--primary-700); font-size: 0.95rem;">
                    {{ formatarFaixa(regra) }}
                  </strong>
                </td>
                <td>
                  <span style="font-size: 0.85rem; color: var(--slate-600);">
                    {{ regra.descricao || '—' }}
                  </span>
                </td>
                <td>
                  <!-- Stepper inline dos aprovadores -->
                  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
                    <ng-container *ngFor="let ap of regra.aprovadores; let last = last">
                      <span class="badge" style="background: var(--slate-100); border: 1px solid var(--slate-300); color: var(--slate-800); font-weight: 500; font-size: 0.78rem;">
                        <strong>{{ ap.ordem }}º</strong> {{ ap.usuario?.nome }}
                      </span>
                      <span *ngIf="!last" style="color: var(--slate-400); font-weight: bold;">→</span>
                    </ng-container>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="editarRegra(regra)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      style="color: var(--rose-600);"
                      (click)="excluirRegra(regra.id)"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class RegrasAlcadaComponent implements OnInit {
  obras: Obra[] = [];
  usuarios: Usuario[] = [];
  regras: RegraAlcada[] = [];

  obraSelecionadaId: string = '';
  loadingRegras: boolean = false;
  erro: string | null = null;

  // Formulário
  exibindoFormulario: boolean = false;
  editandoRegraId: string | null = null;
  salvando: boolean = false;
  erroFormulario: string | null = null;

  formRegra: {
    descricao: string;
    valorMinimo: number;
    valorMaximo: number | null;
    aprovadores: { usuarioId: string; ordem: number }[];
  } = {
    descricao: '',
    valorMinimo: 0,
    valorMaximo: 10000,
    aprovadores: [],
  };

  novoUsuarioId: string = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit() {
    this.carregarObrasEUsuarios();
  }

  get usuariosDisponiveis(): Usuario[] {
    const jaAdicionados = new Set(this.formRegra.aprovadores.map((a) => a.usuarioId));
    return this.usuarios.filter((u) => !jaAdicionados.has(u.id));
  }

  carregarObrasEUsuarios() {
    this.api.getObras().subscribe({
      next: (obras) => {
        this.obras = obras;
        if (obras.length > 0 && !this.obraSelecionadaId) {
          this.obraSelecionadaId = obras[0].id;
          this.carregarRegrasObra();
        }
      },
    });

    this.api.getUsuarios().subscribe({
      next: (usuarios) => (this.usuarios = usuarios),
    });
  }

  carregarRegrasObra() {
    if (!this.obraSelecionadaId) {
      this.regras = [];
      return;
    }

    this.loadingRegras = true;
    this.erro = null;

    this.api.getRegrasPorObra(this.obraSelecionadaId).subscribe({
      next: (dados) => {
        this.regras = dados;
        this.loadingRegras = false;
      },
      error: (err) => {
        this.loadingRegras = false;
        this.erro =
          err.error?.message || 'Erro ao consultar regras de alçada da obra.';
      },
    });
  }

  formatarFaixa(regra: RegraAlcada): string {
    const min = Number(regra.valorMinimo).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    if (regra.valorMaximo === null || regra.valorMaximo === undefined) {
      return `Acima de ${min}`;
    }
    const max = Number(regra.valorMaximo).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return `${min} até ${max}`;
  }

  getNomeUsuario(usuarioId: string): string {
    return this.usuarios.find((u) => u.id === usuarioId)?.nome || 'Usuário';
  }

  getCargoUsuario(usuarioId: string): string {
    return this.usuarios.find((u) => u.id === usuarioId)?.cargo || 'Cargo';
  }

  iniciarNovaRegra() {
    this.editandoRegraId = null;
    this.formRegra = {
      descricao: '',
      valorMinimo: 0,
      valorMaximo: 10000,
      aprovadores: [],
    };
    this.novoUsuarioId = '';
    this.erroFormulario = null;
    this.exibindoFormulario = true;
  }

  editarRegra(regra: RegraAlcada) {
    this.editandoRegraId = regra.id;
    this.formRegra = {
      descricao: regra.descricao || '',
      valorMinimo: Number(regra.valorMinimo),
      valorMaximo: regra.valorMaximo !== null ? Number(regra.valorMaximo) : null,
      aprovadores: regra.aprovadores.map((a) => ({
        usuarioId: a.usuarioId,
        ordem: a.ordem,
      })),
    };
    this.novoUsuarioId = '';
    this.erroFormulario = null;
    this.exibindoFormulario = true;
  }

  cancelarFormulario() {
    this.exibindoFormulario = false;
    this.editandoRegraId = null;
  }

  adicionarAprovadorNaRegra() {
    if (!this.novoUsuarioId) return;
    this.formRegra.aprovadores.push({
      usuarioId: this.novoUsuarioId,
      ordem: this.formRegra.aprovadores.length + 1,
    });
    this.novoUsuarioId = '';
  }

  removerAprovadorDaRegra(index: number) {
    this.formRegra.aprovadores.splice(index, 1);
    this.reajustarOrdens();
  }

  moverAprovador(index: number, delta: number) {
    const novoIndex = index + delta;
    if (novoIndex < 0 || novoIndex >= this.formRegra.aprovadores.length) return;

    const item = this.formRegra.aprovadores.splice(index, 1)[0];
    this.formRegra.aprovadores.splice(novoIndex, 0, item);
    this.reajustarOrdens();
  }

  reajustarOrdens() {
    this.formRegra.aprovadores.forEach((a, i) => (a.ordem = i + 1));
  }

  salvarRegra() {
    if (this.formRegra.valorMinimo < 0) {
      this.erroFormulario = 'O valor mínimo não pode ser negativo.';
      return;
    }

    if (
      this.formRegra.valorMaximo !== null &&
      this.formRegra.valorMaximo <= this.formRegra.valorMinimo
    ) {
      this.erroFormulario = 'O valor máximo deve ser maior que o valor mínimo.';
      return;
    }

    if (this.formRegra.aprovadores.length === 0) {
      this.erroFormulario =
        'Adicione pelo menos 1 usuário aprovador na ordem do fluxo.';
      return;
    }

    this.salvando = true;
    this.erroFormulario = null;

    if (this.editandoRegraId) {
      this.api
        .atualizarRegraAlcada(this.editandoRegraId, {
          descricao: this.formRegra.descricao,
          valorMinimo: Number(this.formRegra.valorMinimo),
          valorMaximo:
            this.formRegra.valorMaximo !== null
              ? Number(this.formRegra.valorMaximo)
              : null,
          aprovadores: this.formRegra.aprovadores,
        })
        .subscribe({
          next: () => {
            this.salvando = false;
            this.exibindoFormulario = false;
            this.carregarRegrasObra();
          },
          error: (err) => {
            this.salvando = false;
            this.erroFormulario =
              err.error?.message || 'Falha ao atualizar a regra de alçada.';
          },
        });
    } else {
      this.api
        .criarRegraAlcada({
          obraId: this.obraSelecionadaId,
          descricao: this.formRegra.descricao,
          valorMinimo: Number(this.formRegra.valorMinimo),
          valorMaximo:
            this.formRegra.valorMaximo !== null
              ? Number(this.formRegra.valorMaximo)
              : null,
          aprovadores: this.formRegra.aprovadores,
        })
        .subscribe({
          next: () => {
            this.salvando = false;
            this.exibindoFormulario = false;
            this.carregarRegrasObra();
          },
          error: (err) => {
            this.salvando = false;
            this.erroFormulario =
              err.error?.message || 'Falha ao cadastrar a regra de alçada.';
          },
        });
    }
  }

  excluirRegra(id: string) {
    if (confirm('Deseja realmente remover esta faixa de alçada?')) {
      this.api.excluirRegraAlcada(id).subscribe({
        next: () => this.carregarRegrasObra(),
        error: (err) =>
          alert(err.error?.message || 'Erro ao excluir regra de alçada.'),
      });
    }
  }
}

