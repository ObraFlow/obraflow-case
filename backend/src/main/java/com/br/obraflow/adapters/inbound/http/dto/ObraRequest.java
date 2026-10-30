package com.br.obraflow.adapters.inbound.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "ObraRequest", description = "Dados de uma obra (projeto)")
public record ObraRequest(

        @Schema(description = "Codigo sequencial da obra", example = "OBRA-004")
        @NotBlank(message = "O codigo da obra e' obrigatorio")
        @Size(max = 20, message = "O codigo deve ter no maximo 20 caracteres")
        String codigo,

        @Schema(description = "Nome da obra", example = "Edificio Horizonte")
        @NotBlank(message = "O nome da obra e' obrigatorio")
        @Size(max = 120, message = "O nome deve ter no maximo 120 caracteres")
        String nome,

        @Schema(description = "Endereco da obra", example = "Av. Paulista, 1000 - Sao Paulo/SP")
        @Size(max = 255, message = "O endereco deve ter no maximo 255 caracteres")
        String endereco) {
}
