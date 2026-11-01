import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-rejeicao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="fechar.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 style="color: var(--rose-700); display: flex; align-items: center; gap: 0.5rem;">
            <span>✕</span> Rejeitar Pedido de Compra
          </h3>
          <button
            type="button"
            (click)="fechar.emit()"
            style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--slate-400);"
          >
            &times;
          </button>
        </div>

        <div class="modal-body">
          <p style="margin-bottom: 1rem; color: var(--slate-600); font-size: 0.9rem;">
            A rejeição <strong>interrompe imediatamente</strong> a cadeia de alçadas deste pedido. Por exigência do processo, informe detalhadamente o motivo da não aprovação.
          </p>

          <div class="form-group">
            <label class="form-label">
              Motivo da Rejeição <span class="req">*</span>
            </label>
            <textarea
              class="form-control"
              rows="4"
              [(ngModel)]="motivo"
              placeholder="Ex: Preço cotado do material 20% acima da referência de mercado..."
              [class.is-invalid]="tentouSubmeter && motivoInvalido"
            ></textarea>
            <div *ngIf="tentouSubmeter && motivoInvalido" class="invalid-feedback">
              O motivo é obrigatório e deve ter pelo menos 5 caracteres.
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="fechar.emit()"
            [disabled]="loading"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-danger"
            (click)="confirmarRejeicao()"
            [disabled]="loading"
          >
            <span *ngIf="loading" class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></span>
            Confirmar Rejeição
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ModalRejeicaoComponent {
  @Input() loading: boolean = false;
  @Output() fechar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<string>();

  motivo: string = '';
  tentouSubmeter: boolean = false;

  get motivoInvalido(): boolean {
    return !this.motivo || this.motivo.trim().length < 5;
  }

  confirmarRejeicao() {
    this.tentouSubmeter = true;
    if (this.motivoInvalido) {
      return;
    }
    this.confirmar.emit(this.motivo.trim());
  }
}

