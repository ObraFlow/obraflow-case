import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem;">
      <div class="spinner"></div>
      <p style="margin-top: 1rem; color: var(--slate-500); font-size: 0.9rem;">
        {{ mensagem }}
      </p>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  @Input() mensagem: string = 'Carregando dados...';
}

