import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align: center; padding: 2.5rem 1.5rem; background: #ffffff; border-radius: 0.375rem; border: 1px solid var(--slate-200);">
      <h3 style="font-size: 0.95rem; font-weight: 600; color: var(--slate-800); margin-bottom: 0.35rem;">
        {{ titulo }}
      </h3>
      <p style="color: var(--slate-500); max-width: 440px; margin: 0 auto 1rem auto; font-size: 0.85rem;">
        {{ mensagem }}
      </p>
      <button
        *ngIf="botaoTexto"
        type="button"
        class="btn btn-primary btn-sm"
        (click)="acao.emit()"
      >
        {{ botaoTexto }}
      </button>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() titulo: string = 'Nenhum registro encontrado';
  @Input() mensagem: string = 'Não existem dados cadastrados no momento.';
  @Input() botaoTexto?: string;
  @Output() acao = new EventEmitter<void>();
}
