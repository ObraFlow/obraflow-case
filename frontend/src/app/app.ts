import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from './core/services/api.service';
import { SessionService } from './core/services/session.service';
import { Usuario } from './core/models/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  usuarios: Usuario[] = [];
  usuarioSelecionadoId: string = '';

  constructor(
    private readonly api: ApiService,
    readonly session: SessionService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const ativo = this.session.usuarioAtivo();
    if (ativo) {
      this.usuarios = [ativo];
      this.usuarioSelecionadoId = ativo.id;
    }
  }

  ngOnInit() {
    this.carregarUsuarios();
  }

  carregarUsuarios() {
    this.api.getUsuarios().subscribe({
      next: (dados) => {
        this.usuarios = dados;
        if (dados.length > 0) {
          const ativo = this.session.usuarioAtivo();
          if (ativo) {
            this.usuarioSelecionadoId = ativo.id;
          } else {
            // Default: João Silva
            this.selecionarUsuario(dados[0].id);
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  selecionarUsuario(id: string) {
    this.usuarioSelecionadoId = id;
    const user = this.usuarios.find((u) => u.id === id);
    if (user) {
      this.session.setUsuarioAtivo(user);
    }
    this.cdr.markForCheck();
  }
}
