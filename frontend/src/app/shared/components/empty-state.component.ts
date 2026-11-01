import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="text-align: center; padding: 3.5rem 1.5rem; background: #ffffff; border-radius: 0.75rem; border: 1px dashed var(--slate-300);">
      <div style="font-size: 3rem; margin-bottom: 0.75rem;">{{ icone }}</div>
      <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--slate-800); margin-bottom: 0.5rem;">
        {{ titulo }}
      </h3>
      <p style="color: var(--slate-500); max-width: 420px; margin: 0 auto 1.25rem auto; font-size: 0.9rem;">
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
  @Input() icone: string = '📂';
  @Input() titulo: string = 'Nenhum registro encontrado';
  @Input() mensagem: string = 'Não existem dados cadastrados no momento.';
  @Input() botaoTexto?: string;
  @Output() acao = new EventEmitter<void>();
}

