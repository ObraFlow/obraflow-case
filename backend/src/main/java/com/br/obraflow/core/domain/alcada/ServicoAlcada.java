package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Servico de dominio que resolve qual nivel de alcada se aplica a um pedido.
 * <p>
 * A regra e' deterministica: existe <b>no maximo um</b> nivel por obra que contenha
 * o total do pedido. A nao existencia e' um erro de negocio (o pedido nao pode ser
 * criado); a existencia de mais de um indica Invariante violada no banco de dados.
 */
public final class ServicoAlcada {

    public NivelAlcada nivelAplicavel(List<NivelAlcada> niveis, BigDecimal total, String codigoObra) {
        List<NivelAlcada> aplicaveis = niveis.stream()
                .filter(nivel -> nivel.contem(total))
                .toList();

        if (aplicaveis.isEmpty()) {
            throw new RegraDeNegocioException(
                    "Nao existe regra de alcada configurada para a obra " + codigoObra
                            + " no valor de " + total.setScale(2, java.math.RoundingMode.HALF_UP)
                            + ". Configure uma faixa de valor que cubra este pedido.");
        }
        if (aplicaveis.size() > 1) {
            throw new ConflitoException(
                    "Ha mais de uma faixa de alcada aplicavel a obra " + codigoObra
                            + " no valor de " + total + ". As faixas se sobrepoem.");
        }
        return aplicaveis.get(0);
    }

    /**
     * Valida que a nova faixa nao se sobrepoe a nenhuma faixa ja existente da mesma obra.
     */
    public void validarNaoSobreposicao(FaixaValor novaFaixa, List<NivelAlcada> niveisExistentes,
                                       UUID nivelBeingEditado, String codigoObra) {
        for (NivelAlcada existente : niveisExistentes) {
            if (existente.id().equals(nivelBeingEditado)) {
                continue;
            }
            if (existente.faixa().sobrepoe(novaFaixa)) {
                throw new ConflitoException(
                        "A faixa informada se sobrepoe a faixa ja existente ("
                                + existente.faixa().rotulo() + ") da obra " + codigoObra + ".");
            }
        }
    }
}
