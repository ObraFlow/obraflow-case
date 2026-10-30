package com.br.obraflow.core.domain.shared;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Quantidade de um item de pedido. Sempre positiva, com escala fixa de 4 casas.
 */
public final class Quantidade {

    public static final int ESCALA = 4;

    private final BigDecimal valor;

    private Quantidade(BigDecimal valor) {
        if (valor == null) {
            throw new ArgumentoInvalidoException("A quantidade nao pode ser nula.");
        }
        this.valor = valor.setScale(ESCALA, RoundingMode.HALF_UP);
        if (this.valor.signum() <= 0) {
            throw new ArgumentoInvalidoException("A quantidade deve ser maior que zero.");
        }
    }

    public static Quantidade de(BigDecimal valor) {
        return new Quantidade(valor);
    }

    public static Quantidade de(long valor) {
        return new Quantidade(BigDecimal.valueOf(valor));
    }

    public BigDecimal valor() {
        return valor;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof Quantidade outra)) {
            return false;
        }
        return valor.compareTo(outra.valor) == 0;
    }

    @Override
    public int hashCode() {
        return valor.stripTrailingZeros().hashCode();
    }

    @Override
    public String toString() {
        return valor.toPlainString();
    }
}
