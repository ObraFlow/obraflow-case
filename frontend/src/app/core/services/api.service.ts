import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Fornecedor,
  Obra,
  PedidoDetalhes,
  PedidoResumo,
  RegraAlcada,
  Usuario,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  // --- Obras ---
  getObras(): Observable<Obra[]> {
    return this.http.get<Obra[]>(`${this.baseUrl}/obras`);
  }

  getObraById(id: string): Observable<Obra> {
    return this.http.get<Obra>(`${this.baseUrl}/obras/${id}`);
  }

  // --- Usuários ---
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/usuarios`);
  }

  // --- Fornecedores ---
  getFornecedores(): Observable<Fornecedor[]> {
    return this.http.get<Fornecedor[]>(`${this.baseUrl}/fornecedores`);
  }

  // --- Regras de Alçada ---
  getRegrasPorObra(obraId: string): Observable<RegraAlcada[]> {
    const params = new HttpParams().set('obraId', obraId);
    return this.http.get<RegraAlcada[]>(`${this.baseUrl}/regras-alcada`, {
      params,
    });
  }

  criarRegraAlcada(payload: {
    obraId: string;
    descricao?: string;
    valorMinimo: number;
    valorMaximo?: number | null;
    aprovadores: { usuarioId: string; ordem: number }[];
  }): Observable<RegraAlcada> {
    return this.http.post<RegraAlcada>(
      `${this.baseUrl}/regras-alcada`,
      payload,
    );
  }

  atualizarRegraAlcada(
    id: string,
    payload: {
      descricao?: string;
      valorMinimo?: number;
      valorMaximo?: number | null;
      aprovadores?: { usuarioId: string; ordem: number }[];
    },
  ): Observable<RegraAlcada> {
    return this.http.put<RegraAlcada>(
      `${this.baseUrl}/regras-alcada/${id}`,
      payload,
    );
  }

  excluirRegraAlcada(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/regras-alcada/${id}`);
  }

  // --- Pedidos de Compra ---
  getPedidos(filtros?: {
    obraId?: string;
    status?: string;
  }): Observable<PedidoResumo[]> {
    let params = new HttpParams();
    if (filtros?.obraId) {
      params = params.set('obraId', filtros.obraId);
    }
    if (filtros?.status) {
      params = params.set('status', filtros.status);
    }
    return this.http.get<PedidoResumo[]>(`${this.baseUrl}/pedidos`, { params });
  }

  getPedidoById(id: string): Observable<PedidoDetalhes> {
    return this.http.get<PedidoDetalhes>(`${this.baseUrl}/pedidos/${id}`);
  }

  criarPedido(payload: {
    obraId: string;
    fornecedorId: string;
    dataPedido: string;
    observacoes?: string;
    itens: {
      descricao: string;
      quantidade: number;
      unidade: string;
      precoUnitario: number;
    }[];
  }): Observable<PedidoDetalhes> {
    return this.http.post<PedidoDetalhes>(`${this.baseUrl}/pedidos`, payload);
  }

  aprovarPedido(
    pedidoId: string,
    payload: { usuarioId: string; observacao?: string },
  ): Observable<PedidoDetalhes> {
    return this.http.post<PedidoDetalhes>(
      `${this.baseUrl}/pedidos/${pedidoId}/aprovar`,
      payload,
    );
  }

  rejeitarPedido(
    pedidoId: string,
    payload: { usuarioId: string; motivo: string },
  ): Observable<PedidoDetalhes> {
    return this.http.post<PedidoDetalhes>(
      `${this.baseUrl}/pedidos/${pedidoId}/rejeitar`,
      payload,
    );
  }
}

