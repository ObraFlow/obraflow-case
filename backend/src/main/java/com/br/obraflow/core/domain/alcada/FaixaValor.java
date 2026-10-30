package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Faixa de valores de um nivel de alcada: intervalo semiaberto {@code [inferior, superior)}.
 * <ul>
 *     <li>{@code limiteInferior} e' inclusivo e nao pode ser negativo;</li>
 *     <li>{@code limiteSuperior} e' exclusivo e pode ser {@code null}, o que representa
 *         uma faixa sem teto ("acima de X");</li>
 *     <li>duas faixas da mesma obra nao podem se sobrepor - isso e' garantido no
 *         dominio ({@link #sobrepoe(FaixaValor)}) e no banco (constraint EXCLUDE do Postgres).</li>
 * </ul>
 */
public final class FaixaValor {

    private static final int ESCALA = 4;

    private final BigDecimal limiteInferior;
    private final BigDecimal limiteSuperior;

    private FaixaValor(BigDecimal limiteInferior, BigDecimal limiteSuperior) {
        this.limiteInferior = normalizar(limiteInferior, "limite inferior");
        this.limiteSuperior = limiteSuperior == null ? null : normalizar(limiteSuperior, "limite superior");

        if (this.limiteInferior.signum() < 0) {
            throw new ArgumentoInvalidoException("O limite inferior da faixa nao pode ser negativo.");
        }
        if (this.limiteSuperior != null && this.limiteSuperior.compareTo(this.limiteInferior) <= 0) {
            throw new ArgumentoInvalidoException(
                    "O limite superior da faixa deve ser maior que o limite inferior.");
        }
    }

    public static FaixaValor de(BigDecimal limiteInferior, BigDecimal limiteSuperior) {
        return new FaixaValor(limiteInferior, limiteSuperior);
    }

    /** Faixa "ate X" - comeca em zero e termina (exclusivamente) em X. */
    public static FaixaValor ate(BigDecimal limiteSuperior) {
        return new FaixaValor(BigDecimal.ZERO, limiteSuperior);
    }

    /** Faixa "acima de X" - sem teto. */
    public static FaixaValor acimaDe(BigDecimal limiteInferior) {
        return new FaixaValor(limiteInferior, null);
    }

    /** Faixa sem limites - qualquer valor. */
    public static FaixaValor qualquerValor() {
        return new FaixaValor(BigDecimal.ZERO, null);
    }

    public BigDecimal limiteInferior() {
        return limiteInferior;
    }

    public BigDecimal limiteSuperior() {
        return limiteSuperior;
    }

    public boolean semTeto() {
        return limiteSuperior == null;
    }

    /** Verifica se o valor pertence a esta faixa. Limite inferior inclusivo, superior exclusivo. */
    public boolean contem(BigDecimal valor) {
        if (valor == null) {
            return false;
        }
        BigDecimal v = normalizar(valor, "valor");
        if (v.compareTo(limiteInferior) < 0) {
            return false;
        }
        return limiteSuperior == null || v.compareTo(limiteSuperior) < 0;
    }

    /** Verifica se as duas faixas se sobrepoem. */
    public boolean sobrepoe(FaixaValor outra) {
        BigDecimal inicio = this.limiteInferior.max(outra.limiteInferior);
        BigDecimal fim = menor(this.limiteSuperior, outra.limiteSuperior);
        if (fim == null) {
            return true;
        }
        return inicio.compareTo(fim) < 0;
    }

    /**
     * Rotulo pronto para exibicao, evitando que o front-end replique a regra de formatacao.
     * Ex.: "Ate R$ 10.000,00", "Acima de R$ 10.000,00", "De R$ 5.000,00 a R$ 25.000,00".
     */
    public String rotulo() {
        NumberFormat moeda = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR"));
        if (limiteSuperior == null) {
            return limiteInferior.signum() == 0
                    ? "Qualquer valor"
                    : "Acima de " + moeda.format(limiteInferior);
        }
        if (limiteInferior.signum() == 0) {
            return "Ate " + moeda.format(limiteSuperior);
        }
        return "De " + moeda.format(limiteInferior) + " a " + moeda.format(limiteSuperior);
    }

    private static BigDecimal menor(BigDecimal a, BigDecimal b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.min(b);
    }

    private static BigDecimal normalizar(BigDecimal valor, String descricao) {
        if (valor == null) {
            throw new ArgumentoInvalidoException("O " + descricao + " da faixa nao pode ser nulo.");
        }
        return valor.setScale(ESCALA, RoundingMode.HALF_UP);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof FaixaValor outra)) {
            return false;
        }
        return limiteInferior.compareTo(outra.limiteInferior) == 0
                && (limiteSuperior == null
                        ? outra.limiteSuperior == null
                        : limiteSuperior.compareTo(outra.limiteSuperior) == 0);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(limiteInferior.stripTrailingZeros(),
                limiteSuperior == null ? null : limiteSuperior.stripTrailingZeros());
    }

    @Override
    public String toString() {
        return rotulo();
    }
}
