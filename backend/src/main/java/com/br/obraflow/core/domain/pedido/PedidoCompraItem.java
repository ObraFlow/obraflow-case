package com.br.obraflow.core.domain.pedido;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.shared.Quantidade;
import com.br.obraflow.core.domain.shared.ValorMonetario;

import java.util.Objects;

/**
 * Item de um pedido de compra. O total e' sempre derivado de
 * {@code quantidade * precoUnitario} e nunca informado pelo cliente.
 */
public final class PedidoCompraItem {

    private final String descricao;
    private final Quantidade quantidade;
    private final String unidade;
    private final ValorMonetario precoUnitario;
    private final ValorMonetario total;

    public PedidoCompraItem(String descricao, Quantidade quantidade, String unidade,
                            ValorMonetario precoUnitario) {
        this.descricao = validarDescricao(descricao);
        this.quantidade = Objects.requireNonNull(quantidade, "quantidade do item e' obrigatoria");
        this.unidade = validarUnidade(unidade);
        this.precoUnitario = Objects.requireNonNull(precoUnitario, "preco unitario do item e' obrigatorio");
        this.total = precoUnitario.multiplicar(quantidade.valor());
    }

    private static String validarDescricao(String descricao) {
        if (descricao == null || descricao.isBlank()) {
            throw new ArgumentoInvalidoException("A descricao do item e' obrigatoria.");
        }
        return descricao.trim();
    }

    private static String validarUnidade(String unidade) {
        if (unidade == null || unidade.isBlank()) {
            throw new ArgumentoInvalidoException("A unidade do item e' obrigatoria.");
        }
        return unidade.trim();
    }

    public String descricao() {
        return descricao;
    }

    public Quantidade quantidade() {
        return quantidade;
    }

    public String unidade() {
        return unidade;
    }

    public ValorMonetario precoUnitario() {
        return precoUnitario;
    }

    public ValorMonetario total() {
        return total;
    }
}
