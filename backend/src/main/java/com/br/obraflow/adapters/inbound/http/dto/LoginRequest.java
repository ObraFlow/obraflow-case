package com.br.obraflow.adapters.inbound.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(name = "LoginRequest", description = "Credenciais de acesso")
public record LoginRequest(

        @Schema(description = "E-mail cadastrado", example = "amanda.souza@obraflow.com.br")
        @NotBlank(message = "O e-mail e' obrigatorio")
        @Email(message = "E-mail invalido")
        String email,

        @Schema(description = "Senha do usuario", example = "obraflow123")
        @NotBlank(message = "A senha e' obrigatoria")
        String senha) {
}
