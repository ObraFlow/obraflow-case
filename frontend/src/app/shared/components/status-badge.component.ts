import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoStatus } from '../../core/models/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="badge"
      [ngClass]="{
        'badge-pending': status === 'PENDENTE',
        'badge-approved': status === 'APROVADO',
        'badge-rejected': status === 'REJEITADO'
      }"
    >
      <span *ngIf="status === 'PENDENTE'">⏳</span>
      <span *ngIf="status === 'APROVADO'">✓</span>
      <span *ngIf="status === 'REJEITADO'">✕</span>
      {{ status }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: PedidoStatus | string;
}

