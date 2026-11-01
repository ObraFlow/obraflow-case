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
    <div class="container" style="padding-top: 1.5rem; padding-bottom: 3rem;">
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h1>Regras de Alçada</h1>
          <p style="margin-top: 0.2rem;">Configuração de faixas de valor e cadeia de aprovadores por obra.</p>
        </div>
        <button
          *ngIf="obraSelecionadaId && !exibindoFormulario"
          type="button"
          class="btn btn-primary btn-sm"
          (click)="iniciarNovaRegra()"
        >
          Nova Faixa
        </button>
      </div>

      <!-- Seletor de Obra -->
      <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
        <label class="form-label" style="font-size: 0.78rem;">Selecione a Obra</label>
        <div style="display: flex; gap: 0.75rem; align-items: center; max-width: 440px;">
          <select
            class="form-select form-control-sm"
            [(ngModel)]="obraSelecionadaId"
            (change)="carregarRegrasObra()"
          >
            <option value="">Selecione...</option>
            <option *ngFor="let obra of obras" [value]="obra.id">{{ obra.nome }}</option>
          </select>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="carregarRegrasObra()"
            [disabled]="!obraSelecionadaId || loadingRegras"
          >
            Atualizar
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <app-loading-spinner
        *ngIf="loadingRegras"
        mensagem="Carregando regras de alçada..."
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
        titulo="Selecione uma obra"
        mensagem="Escolha uma obra no seletor para gerenciar as regras de aprovação."
      ></app-empty-state>

      <!-- Empty State se obra não tem regras cadastradas -->
      <app-empty-state
        *ngIf="obraSelecionadaId && !loadingRegras && !erro && regras.length === 0 && !exibindoFormulario"
        titulo="Nenhuma regra cadastrada"
        mensagem="Esta obra ainda não possui faixas de alçada cadastradas."
        botaoTexto="Cadastrar Regra"
        (acao)="iniciarNovaRegra()"
      ></app-empty-state>

      <!-- Formulário de Criação / Edição de Regra -->
      <div *ngIf="exibindoFormulario" class="card" style="margin-bottom: 1.5rem; border-color: var(--primary-300);">
        <div class="card-header" style="background: var(--primary-50);">
          <h3 style="color: var(--primary-800);">
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

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.85rem; margin-bottom: 1rem;">
            <!-- Descrição -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Descrição</label>
              <input
                type="text"
                class="form-control form-control-sm"
                [(ngModel)]="formRegra.descricao"
                placeholder="Ex: Até R$ 10.000,00"
              />
            </div>

            <!-- Valor Mínimo -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Valor Mínimo (R$) <span class="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                class="form-control form-control-sm"
                [(ngModel)]="formRegra.valorMinimo"
              />
            </div>

            <!-- Valor Máximo -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">
                Valor Máximo (R$)
                <small style="color: var(--slate-500);">(deixe vazio para sem teto)</small>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                class="form-control form-control-sm"
                [(ngModel)]="formRegra.valorMaximo"
                placeholder="Sem limite"
              />
            </div>
          </div>

          <!-- Cadeia de Aprovadores -->
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--slate-200);">
            <div style="margin-bottom: 0.65rem;">
              <strong style="color: var(--slate-800); font-size: 0.85rem;">Ordem de Aprovadores</strong>
              <p style="font-size: 0.78rem; color: var(--slate-500); margin: 0;">
                A ordem define a sequência de liberação do pedido.
              </p>
            </div>

            <!-- Lista de Aprovadores -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.85rem;">
              <div
                *ngFor="let aprovador of formRegra.aprovadores; let idx = index"
                style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 0.25rem;"
              >
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <span class="badge" style="background: var(--slate-200); color: var(--slate-700); font-size: 0.75rem;">
                    {{ idx + 1 }}º
                  </span>
                  <div>
                    <strong style="font-size: 0.85rem;">{{ getNomeUsuario(aprovador.usuarioId) }}</strong>
                    <span style="font-size: 0.75rem; color: var(--slate-500); margin-left: 0.5rem;">
                      {{ getCargoUsuario(aprovador.usuarioId) }}
                    </span>
                  </div>
                </div>

                <!-- Botões de Reordenação -->
                <div style="display: flex; gap: 0.25rem;">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="padding: 0.15rem 0.45rem; font-size: 0.75rem;"
                    [disabled]="idx === 0"
                    (click)="moverAprovador(idx, -1)"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="padding: 0.15rem 0.45rem; font-size: 0.75rem;"
                    [disabled]="idx === formRegra.aprovadores.length - 1"
                    (click)="moverAprovador(idx, 1)"
                  >
                    Descer
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style="color: var(--rose-600); padding: 0.15rem 0.45rem; font-size: 0.75rem;"
                    (click)="removerAprovadorDaRegra(idx)"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>

            <!-- Adicionar Aprovador -->
            <div style="display: flex; gap: 0.5rem; align-items: center; max-width: 480px;">
              <select class="form-select form-control-sm" [(ngModel)]="novoUsuarioId">
                <option value="">Selecione um usuário...</option>
                <option *ngFor="let u of usuariosDisponiveis" [value]="u.id">
                  {{ u.nome }} ({{ u.cargo }})
                </option>
              </select>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                [disabled]="!novoUsuarioId"
                (click)="adicionarAprovadorNaRegra()"
              >
                Adicionar
              </button>
            </div>
          </div>

          <!-- Ações do Formulário -->
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px solid var(--slate-200);">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()" [disabled]="salvando">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary btn-sm" (click)="salvarRegra()" [disabled]="salvando">
              <span *ngIf="salvando" class="spinner" style="width: 0.85rem; height: 0.85rem; border-width: 2px;"></span>
              Salvar Regra
            </button>
          </div>
        </div>
      </div>

      <!-- Tabela de Regras -->
      <div *ngIf="obraSelecionadaId && !loadingRegras && regras.length > 0" class="card">
        <div class="card-header">
          <h3>Faixas Configuradas ({{ regras.length }})</h3>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="min-width: 170px;">Faixa de Valor</th>
                <th style="min-width: 180px;">Descrição</th>
                <th style="min-width: 280px;">Aprovadores (Ordem)</th>
                <th style="text-align: right; width: 140px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let regra of regras">
                <td>
                  <strong style="color: var(--primary-700); font-size: 0.85rem;">
                    {{ formatarFaixa(regra) }}
                  </strong>
                </td>
                <td>
                  <span style="font-size: 0.825rem; color: var(--slate-600);">
                    {{ regra.descricao || '—' }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
                    <ng-container *ngFor="let ap of regra.aprovadores; let last = last">
                      <span class="badge" style="background: var(--slate-100); border: 1px solid var(--slate-300); color: var(--slate-800); font-size: 0.75rem;">
                        {{ ap.ordem }}º {{ ap.usuario?.nome }}
                      </span>
                      <span *ngIf="!last" style="color: var(--slate-400);">→</span>
                    </ng-container>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div style="display: flex; justify-content: flex-end; gap: 0.35rem;">
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

