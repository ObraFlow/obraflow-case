package com.br.obraflow.adapters.inbound.http.dto;

import com.br.obraflow.core.domain.pedido.TipoDecisao;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "DecisaoRequest", description = "Decisao do aprovador sobre a etapa corrente")
public record DecisaoRequest(

        @Schema(description = "Decisao aplicada", allowableValues = {"APROVADO", "REJEITADO"})
        @NotNull(message = "A decisao e' obrigatoria")
        TipoDecisao decisao,

        @Schema(description = "Motivo (obrigatorio em caso de rejeicao)")
        @Size(max = 500, message = "O motivo deve ter no maximo 500 caracteres")
        String motivo) {
}
