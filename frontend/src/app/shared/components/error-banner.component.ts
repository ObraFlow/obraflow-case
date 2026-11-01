import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert alert-danger" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.25rem;">⚠️</span>
        <div>
          <strong style="display: block; font-size: 0.9rem;">Erro na comunicação</strong>
          <span style="font-size: 0.85rem;">{{ mensagem }}</span>
        </div>
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
  @Input() mensagem: string = 'Não foi possível conectar à API. Verifique se o servidor backend está em execução.';
  @Input() mostrarRetry: boolean = true;
  @Output() retry = new EventEmitter<void>();
}

