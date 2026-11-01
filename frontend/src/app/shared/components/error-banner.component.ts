import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
      <div>
        <strong style="display: block; font-size: 0.85rem;">Erro de conexão</strong>
        <span style="font-size: 0.8rem;">{{ mensagem }}</span>
      </div>
      <button
        *ngIf="mostrarRetry"
        type="button"
        class="btn btn-secondary btn-sm"
        (click)="retry.emit()"
      >
        Tentar novamente
      </button>
    </div>
  `,
})
export class ErrorBannerComponent {
  @Input() mensagem: string = 'Não foi possível carregar os dados. Verifique a conexão com o servidor.';
  @Input() mostrarRetry: boolean = true;
  @Output() retry = new EventEmitter<void>();
}
