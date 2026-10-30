package com.br.obraflow.core.domain.shared;

import java.util.List;

/**
 * Pagina de resultados independente de framework (o core nao conhece Spring Data).
 */
public record Pagina<T>(List<T> conteudo, int pagina, int tamanho, long totalElementos) {

    public Pagina {
        conteudo = conteudo == null ? List.of() : List.copyOf(conteudo);
    }

    public static <T> Pagina<T> vazia(int pagina, int tamanho) {
        return new Pagina<>(List.of(), pagina, tamanho, 0);
    }

    public int totalPaginas() {
        if (tamanho <= 0) {
            return 0;
        }
        return (int) Math.ceil((double) totalElementos / tamanho);
    }

    public boolean vazia() {
        return conteudo.isEmpty();
    }
}
