package com.br.obraflow.adapters.inbound.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Schema(name = "NivelAlcadaRequest", description = "Faixa de valores e cadeia de aprovadores de uma obra")
public record NivelAlcadaRequest(

        @Schema(description = "Obra que a faixa pertence", example = "3f7c1c66-5b9a-4f0e-9a3e-2d7b8c9d0e11")
        @NotNull(message = "A obra e' obrigatoria")
        UUID obraId,

        @Schema(description = "Limite inferior (inclusivo)", example = "0.0000")
        @NotNull(message = "O limite inferior e' obrigatorio")
        @DecimalMin(value = "0", message = "O limite inferior nao pode ser negativo")
        BigDecimal limiteInferior,

        @Schema(description = "Limite superior (exclusivo). Ausente = faixa sem teto",
                example = "10000.0000", nullable = true)
        @DecimalMin(value = "0", message = "O limite superior nao pode ser negativo")
        BigDecimal limiteSuperior,

        @Schema(description = "Descricao da faixa", example = "Compras de pequeno valor")
        String descricao,

        @Schema(description = "Usuarios aprovadores, na ordem do fluxo de aprovacao")
        @NotEmpty(message = "A faixa deve possuir ao menos um aprovador")
        List<UUID> usuariosAprovadores) {
}
