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
          <h3 style="color: var(--slate-900);">
            Rejeitar Pedido de Compra
          </h3>
          <button
            type="button"
            (click)="fechar.emit()"
            style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--slate-400);"
          >
            &times;
          </button>
        </div>

        <div class="modal-body">
          <p style="margin-bottom: 0.85rem; color: var(--slate-600); font-size: 0.85rem;">
            A rejeição interrompe o fluxo de aprovação. Informe o motivo da não aprovação deste pedido.
          </p>

          <div class="form-group">
            <label class="form-label">
              Motivo da Rejeição <span class="req">*</span>
            </label>
            <textarea
              class="form-control"
              rows="4"
              [(ngModel)]="motivo"
              placeholder="Descreva o motivo da rejeição..."
              [class.is-invalid]="tentouSubmeter && motivoInvalido"
            ></textarea>
            <div *ngIf="tentouSubmeter && motivoInvalido" class="invalid-feedback">
              O motivo é obrigatório (mínimo de 5 caracteres).
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="fechar.emit()"
            [disabled]="loading"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-danger btn-sm"
            (click)="confirmarRejeicao()"
            [disabled]="loading"
          >
            <span *ngIf="loading" class="spinner" style="width: 0.85rem; height: 0.85rem; border-width: 2px;"></span>
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
