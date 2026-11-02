import { Injectable, signal } from '@angular/core';
import { Usuario } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly storageKey = 'obraflow_active_user';

  // Usuário atualmente ativo na sessão (signal reativo do Angular)
  readonly usuarioAtivo = signal<Usuario | null>(null);

  constructor() {
    this.carregarSessao();
  }

  setUsuarioAtivo(usuario: Usuario) {
    this.usuarioAtivo.set(usuario);
    localStorage.setItem(this.storageKey, JSON.stringify(usuario));
  }

  carregarSessao() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.usuarioAtivo.set(JSON.parse(saved));
      } catch {
        this.usuarioAtivo.set(null);
      }
    }
  }
}

