package com.br.obraflow.core.domain.shared;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Valor monetario do dominio.
 * <p>
 * Escala fixa de 4 casas decimais com arredondamento HALF_UP, igual ao
 * {@code round(numeric, 4)} do PostgreSQL. Isso garante que o total persistido
 * seja exatamente {@code quantidade * preco_unitario} e permite que o proprio
 * banco valide a igualdade via CHECK constraint.
 */
public final class ValorMonetario {

    public static final int ESCALA = 4;

    public static final ValorMonetario ZERO = new ValorMonetario(BigDecimal.ZERO);

    private final BigDecimal valor;

    private ValorMonetario(BigDecimal valor) {
        this.valor = normalizar(valor);
    }

    public static ValorMonetario de(BigDecimal valor) {
        return new ValorMonetario(valor);
    }

    public static ValorMonetario de(long valor) {
        return new ValorMonetario(BigDecimal.valueOf(valor));
    }

    public BigDecimal valor() {
        return valor;
    }

    public ValorMonetario mais(ValorMonetario outro) {
        return new ValorMonetario(valor.add(outro.valor));
    }

    public ValorMonetario multiplicar(BigDecimal fator) {
        return new ValorMonetario(valor.multiply(fator));
    }

    public boolean maiorQue(ValorMonetario outro) {
        return valor.compareTo(outro.valor) > 0;
    }

    public boolean menorOuIgualQue(ValorMonetario outro) {
        return valor.compareTo(outro.valor) <= 0;
    }

    public boolean igualA(ValorMonetario outro) {
        return valor.compareTo(outro.valor) == 0;
    }

    private static BigDecimal normalizar(BigDecimal valor) {
        if (valor == null) {
            throw new ArgumentoInvalidoException("O valor monetario nao pode ser nulo.");
        }
        return valor.setScale(ESCALA, RoundingMode.HALF_UP);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof ValorMonetario outro)) {
            return false;
        }
        return valor.compareTo(outro.valor) == 0;
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
