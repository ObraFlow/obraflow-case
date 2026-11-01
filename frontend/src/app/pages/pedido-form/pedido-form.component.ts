import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Fornecedor, Obra } from '../../core/models/models';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner.component';

@Component({
  selector: 'app-pedido-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
  ],
  template: `
    <div class="container" style="padding-top: 2rem; padding-bottom: 4rem; max-width: 980px;">
      <!-- Breadcrumb e Título -->
      <div style="margin-bottom: 1.5rem;">
        <a routerLink="/pedidos" style="color: var(--primary-600); text-decoration: none; font-size: 0.85rem; font-weight: 500;">
          ← Voltar para lista de pedidos
        </a>
        <h1 style="margin-top: 0.5rem;">Novo Pedido de Compra</h1>
        <p>Preencha os dados do pedido e adicione os itens. O valor total definirá automaticamente a regra de alçada aplicável.</p>
      </div>

      <!-- Loading State Inicial -->
      <app-loading-spinner
        *ngIf="loadingAuxiliares"
        mensagem="Carregando obras e fornecedores cadastrados..."
      ></app-loading-spinner>

      <!-- Erro ao Carregar Dados Auxiliares -->
      <app-error-banner
        *ngIf="erroAuxiliares"
        [mensagem]="erroAuxiliares"
        (retry)="carregarDadosAuxiliares()"
      ></app-error-banner>

      <!-- Empty State se Nenhuma Obra Cadastrada -->
      <app-empty-state
        *ngIf="!loadingAuxiliares && !erroAuxiliares && obras.length === 0"
        icone="🏗️"
        titulo="Nenhuma obra cadastrada"
        mensagem="Para emitir um pedido de compra, é necessário que ao menos uma obra esteja cadastrada no sistema ObraFlow."
        botaoTexto="Recarregar Dados"
        (acao)="carregarDadosAuxiliares()"
      ></app-empty-state>

      <!-- Formulário de Pedido -->
      <form
        *ngIf="!loadingAuxiliares && obras.length > 0"
        [formGroup]="form"
        (ngSubmit)="salvarPedido()"
      >
        <!-- Feedback de Erro do Envio -->
        <div *ngIf="erroEnvio" class="alert alert-danger" style="margin-bottom: 1.5rem;">
          <div>
            <strong>Atenção:</strong> {{ erroEnvio }}
          </div>
        </div>

        <!-- Seção 1: Dados Gerais -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <h3>1. Dados Gerais da Solicitação</h3>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
              <!-- Obra -->
              <div class="form-group">
                <label class="form-label">
                  Obra de Destino <span class="req">*</span>
                </label>
                <select
                  class="form-select"
                  formControlName="obraId"
                  [class.is-invalid]="isCampoInvalido('obraId')"
                >
                  <option value="">Selecione a obra...</option>
                  <option *ngFor="let obra of obras" [value]="obra.id">
                    {{ obra.nome }}
                  </option>
                </select>
                <div *ngIf="isCampoInvalido('obraId')" class="invalid-feedback">
                  A seleção da obra é obrigatória.
                </div>
              </div>

              <!-- Fornecedor -->
              <div class="form-group">
                <label class="form-label">
                  Fornecedor Homologado <span class="req">*</span>
                </label>
                <select
                  class="form-select"
                  formControlName="fornecedorId"
                  [class.is-invalid]="isCampoInvalido('fornecedorId')"
                >
                  <option value="">Selecione o fornecedor...</option>
                  <option *ngFor="let f of fornecedores" [value]="f.id">
                    {{ f.razaoSocial }} ({{ f.cnpj }})
                  </option>
                </select>
                <div *ngIf="isCampoInvalido('fornecedorId')" class="invalid-feedback">
                  A seleção do fornecedor é obrigatória.
                </div>
              </div>

              <!-- Data do Pedido -->
              <div class="form-group">
                <label class="form-label">
                  Data de Emissão <span class="req">*</span>
                </label>
                <input
                  type="date"
                  class="form-control"
                  formControlName="dataPedido"
                  [class.is-invalid]="isCampoInvalido('dataPedido')"
                />
                <div *ngIf="isCampoInvalido('dataPedido')" class="invalid-feedback">
                  A data do pedido é obrigatória.
                </div>
              </div>
            </div>

            <!-- Observações -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Observações Internas (Opcional)</label>
              <textarea
                class="form-control"
                rows="2"
                formControlName="observacoes"
                placeholder="Justificativa técnica, lote de entrega, número da requisição ou detalhes da compra..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Seção 2: Itens do Pedido (N Itens Dinâmicos) -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <div>
              <h3>2. Itens do Pedido ({{ itensArray.length }})</h3>
              <p style="font-size: 0.8rem; margin: 0; color: var(--slate-500);">
                Adicione materiais ou serviços. O total de cada item é calculado automaticamente.
              </p>
            </div>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              (click)="adicionarItem()"
            >
              <span>+</span> Adicionar Item
            </button>
          </div>

          <div class="card-body" style="padding: 1rem;">
            <!-- Validação se lista de itens estiver vazia -->
            <div *ngIf="itensArray.length === 0" class="alert alert-warning" style="margin-bottom: 0;">
              O pedido precisa de pelo menos 1 item para ser cadastrado.
            </div>

            <!-- Tabela de Itens Editáveis -->
            <div *ngIf="itensArray.length > 0" class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th style="min-width: 240px;">Descrição do Material/Serviço <span class="req">*</span></th>
                    <th style="width: 110px;">Qtd <span class="req">*</span></th>
                    <th style="width: 100px;">Unidade <span class="req">*</span></th>
                    <th style="width: 140px;">Preço Unit. (R$) <span class="req">*</span></th>
                    <th style="width: 140px; text-align: right;">Total do Item</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody formArrayName="itens">
                  <tr
                    *ngFor="let itemGroup of itensArray.controls; let i = index"
                    [formGroupName]="i"
                  >
                    <td>
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        formControlName="descricao"
                        placeholder="Ex: Cimento CP II 50kg"
                        [class.is-invalid]="isItemInvalido(i, 'descricao')"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        class="form-control form-control-sm"
                        formControlName="quantidade"
                        placeholder="0"
                        [class.is-invalid]="isItemInvalido(i, 'quantidade')"
                      />
                    </td>
                    <td>
                      <select class="form-select form-select-sm" formControlName="unidade">
                        <option value="un">un</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="sc">sc</option>
                        <option value="br">br</option>
                        <option value="h">h</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control form-control-sm"
                        formControlName="precoUnitario"
                        placeholder="0,00"
                        [class.is-invalid]="isItemInvalido(i, 'precoUnitario')"
                      />
                    </td>
                    <td style="text-align: right; font-weight: 600; font-family: monospace; font-size: 0.95rem; color: var(--slate-800);">
                      {{ calcularTotalItem(i) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </td>
                    <td style="text-align: center;">
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        style="color: var(--rose-600); padding: 0.25rem 0.5rem;"
                        title="Remover item"
                        (click)="removerItem(i)"
                        [disabled]="itensArray.length <= 1"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Botão Adicionar Item no Rodapé da Tabela -->
            <div style="margin-top: 1rem; display: flex; justify-content: flex-start;">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="adicionarItem()"
              >
                <span>+</span> Adicionar outro item
              </button>
            </div>
          </div>
        </div>

        <!-- Seção 3: Totalização e Envio -->
        <div class="card" style="margin-bottom: 2rem; background: var(--slate-900); color: #ffffff; border-color: var(--slate-800);">
          <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
            <div>
              <span style="font-size: 0.85rem; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; display: block;">
                Totalização do Pedido
              </span>
              <div style="font-size: 2rem; font-weight: 800; color: #38bdf8;">
                {{ totalGeralCalculado | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </div>
              <span style="font-size: 0.8rem; color: var(--slate-400);">
                Soma de {{ itensArray.length }} {{ itensArray.length === 1 ? 'item' : 'itens' }}
              </span>
            </div>

            <div style="display: flex; gap: 1rem; align-items: center;">
              <a routerLink="/pedidos" class="btn btn-secondary" style="background: transparent; color: var(--slate-300); border-color: var(--slate-700);">
                Cancelar
              </a>
              <button
                type="submit"
                class="btn btn-primary"
                style="padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;"
                [disabled]="form.invalid || enviando || totalGeralCalculado <= 0"
              >
                <span *ngIf="enviando" class="spinner" style="width: 1.1rem; height: 1rem; border-width: 2px;"></span>
                Cadastrar Pedido
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class PedidoFormComponent implements OnInit {
  form!: FormGroup;
  obras: Obra[] = [];
  fornecedores: Fornecedor[] = [];

  loadingAuxiliares: boolean = true;
  erroAuxiliares: string | null = null;
  enviando: boolean = false;
  erroEnvio: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.construirFormulario();
    this.carregarDadosAuxiliares();
  }

  get itensArray(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  get totalGeralCalculado(): number {
    if (!this.itensArray) return 0;
    return this.itensArray.controls.reduce((acc, control) => {
      const qtd = Number(control.get('quantidade')?.value) || 0;
      const preco = Number(control.get('precoUnitario')?.value) || 0;
      return acc + qtd * preco;
    }, 0);
  }

  construirFormulario() {
    const hoje = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      obraId: ['', [Validators.required]],
      fornecedorId: ['', [Validators.required]],
      dataPedido: [hoje, [Validators.required]],
      observacoes: [''],
      itens: this.fb.array([]),
    });

    // Iniciar com 1 item em branco por padrão conforme requisito
    this.adicionarItem();
  }

  criarGrupoItem(): FormGroup {
    return this.fb.group({
      descricao: ['', [Validators.required, Validators.minLength(2)]],
      quantidade: [1, [Validators.required, Validators.min(0.001)]],
      unidade: ['un', [Validators.required]],
      precoUnitario: [0, [Validators.required, Validators.min(0)]],
    });
  }

  adicionarItem() {
    this.itensArray.push(this.criarGrupoItem());
  }

  removerItem(index: number) {
    if (this.itensArray.length > 1) {
      this.itensArray.removeAt(index);
    }
  }

  calcularTotalItem(index: number): number {
    const item = this.itensArray.at(index);
    if (!item) return 0;
    const qtd = Number(item.get('quantidade')?.value) || 0;
    const preco = Number(item.get('precoUnitario')?.value) || 0;
    return qtd * preco;
  }

  isCampoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  isItemInvalido(itemIndex: number, campo: string): boolean {
    const item = this.itensArray.at(itemIndex);
    const c = item?.get(campo);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  carregarDadosAuxiliares() {
    this.loadingAuxiliares = true;
    this.erroAuxiliares = null;

    this.api.getObras().subscribe({
      next: (obras) => {
        this.obras = obras;
        this.api.getFornecedores().subscribe({
          next: (fornecedores) => {
            this.fornecedores = fornecedores;
            this.loadingAuxiliares = false;
          },
          error: (err) => {
            this.loadingAuxiliares = false;
            this.erroAuxiliares =
              err.error?.message || 'Erro ao carregar lista de fornecedores.';
          },
        });
      },
      error: (err) => {
        this.loadingAuxiliares = false;
        this.erroAuxiliares =
          err.error?.message ||
          'Erro ao carregar lista de obras. Verifique o backend.';
      },
    });
  }

  salvarPedido() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erroEnvio = 'Por favor, corrija os campos com erros antes de enviar.';
      return;
    }

    if (this.totalGeralCalculado <= 0) {
      this.erroEnvio = 'O valor total do pedido deve ser maior que zero.';
      return;
    }

    this.enviando = true;
    this.erroEnvio = null;

    const formValue = this.form.value;
    const payload = {
      obraId: formValue.obraId,
      fornecedorId: formValue.fornecedorId,
      dataPedido: formValue.dataPedido,
      observacoes: formValue.observacoes,
      itens: formValue.itens.map((i: any) => ({
        descricao: i.descricao,
        quantidade: Number(i.quantidade),
        unidade: i.unidade,
        precoUnitario: Number(i.precoUnitario),
      })),
    };

    this.api.criarPedido(payload).subscribe({
      next: (criado) => {
        this.enviando = false;
        this.router.navigate(['/pedidos']);
      },
      error: (err) => {
        this.enviando = false;
        this.erroEnvio =
          err.error?.message ||
          'Falha ao cadastrar pedido de compra. Verifique se a obra possui regra de alçada configurada para esta faixa de valor.';
      },
    });
  }
}

