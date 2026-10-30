package com.br.obraflow.adapters.inbound.http.dto;

import com.br.obraflow.core.domain.usuario.Papel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

@Schema(name = "UsuarioRequest", description = "Dados de um usuario do sistema")
public record UsuarioRequest(

        @Schema(description = "Nome do usuario", example = "Amanda Souza")
        @NotBlank(message = "O nome e' obrigatorio")
        @Size(max = 120, message = "O nome deve ter no maximo 120 caracteres")
        String nome,

        @Schema(description = "E-mail de acesso", example = "amanda.souza@obraflow.com.br")
        @NotBlank(message = "O e-mail e' obrigatorio")
        @Email(message = "E-mail invalido")
        String email,

        @Schema(description = "Senha de acesso", example = "obraflow123")
        @NotBlank(message = "A senha e' obrigatoria")
        @Size(min = 6, message = "A senha deve ter ao menos 6 caracteres")
        String senha,

        @Schema(description = "Cargo do usuario", example = "Engenheira de obras")
        @Size(max = 80, message = "O cargo deve ter no maximo 80 caracteres")
        String cargo,

        @Schema(description = "Papeis de acesso",
                allowableValues = {"ADMIN", "COMPRADOR", "APROVADOR"},
                example = "[\"APROVADOR\"]")
        Set<Papel> papeis) {
}
