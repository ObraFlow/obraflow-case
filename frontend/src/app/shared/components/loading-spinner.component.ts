import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 1rem;">
      <div class="spinner"></div>
      <p style="margin-top: 0.75rem; color: var(--slate-500); font-size: 0.85rem;">
        {{ mensagem }}
      </p>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  @Input() mensagem: string = 'Carregando...';
}
