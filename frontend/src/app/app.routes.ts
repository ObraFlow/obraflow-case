import { Routes } from '@angular/router';
import { PedidosListComponent } from './pages/pedidos-list/pedidos-list.component';
import { PedidoFormComponent } from './pages/pedido-form/pedido-form.component';
import { RegrasAlcadaComponent } from './pages/regras-alcada/regras-alcada.component';

export const routes: Routes = [
  { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
  { path: 'pedidos', component: PedidosListComponent },
  { path: 'pedidos/novo', component: PedidoFormComponent },
  { path: 'regras', component: RegrasAlcadaComponent },
  { path: '**', redirectTo: 'pedidos' },
];
