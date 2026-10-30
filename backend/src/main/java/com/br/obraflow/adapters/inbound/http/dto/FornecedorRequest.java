package com.br.obraflow.adapters.inbound.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "FornecedorRequest", description = "Dados de um fornecedor")
public record FornecedorRequest(

        @Schema(description = "Razao social do fornecedor", example = "Cimentos ABC Ltda")
        @NotBlank(message = "O nome do fornecedor e' obrigatorio")
        @Size(max = 160, message = "O nome deve ter no maximo 160 caracteres")
        String nome,

        @Schema(description = "CNPJ ou CPF", example = "12.345.678/0001-90")
        @Size(max = 20, message = "O documento deve ter no maximo 20 caracteres")
        String documento,

        @Schema(description = "E-mail do fornecedor", example = "comercial@cimentosabc.com.br")
        @Email(message = "E-mail invalido")
        String email,

        @Schema(description = "Telefone do fornecedor", example = "(11) 98888-7777")
        @Size(max = 30, message = "O telefone deve ter no maximo 30 caracteres")
        String telefone) {
}
