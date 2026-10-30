package com.br.obraflow.adapters.inbound.http.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Schema(name = "PedidoRequest", description = "Cabecalho e itens de um pedido de compra")
public record PedidoRequest(

        @Schema(description = "Obra do pedido")
        @NotNull(message = "A obra e' obrigatoria")
        UUID obraId,

        @Schema(description = "Fornecedor do pedido")
        @NotNull(message = "O fornecedor e' obrigatorio")
        UUID fornecedorId,

        @Schema(description = "Data do pedido", example = "2026-10-22")
        @NotNull(message = "A data do pedido e' obrigatoria")
        java.time.LocalDate dataPedido,

        @Schema(description = "Observacoes do pedido", example = "Compra de material para a cobertura")
        @Size(max = 1000, message = "As observacoes devem ter no maximo 1000 caracteres")
        String observacoes,

        @Schema(description = "Itens do pedido (o total e' calculado pelo servidor)")
        @NotEmpty(message = "O pedido deve possuir ao menos um item")
        @Valid
        List<ItemPedidoRequest> itens) {

    @Schema(name = "ItemPedidoRequest", description = "Item do pedido de compra")
    public record ItemPedidoRequest(

            @Schema(description = "Descricao do item", example = "Cimento CP II - 50kg")
            @NotBlank(message = "A descricao do item e' obrigatoria")
            @Size(max = 255, message = "A descricao deve ter no maximo 255 caracteres")
            String descricao,

            @Schema(description = "Quantidade", example = "120")
            @NotNull(message = "A quantidade do item e' obrigatoria")
            @Positive(message = "A quantidade deve ser maior que zero")
            BigDecimal quantidade,

            @Schema(description = "Unidade de medida", example = "sc")
            @NotBlank(message = "A unidade do item e' obrigatoria")
            @Size(max = 10, message = "A unidade deve ter no maximo 10 caracteres")
            String unidade,

            @Schema(description = "Preco unitario", example = "32.90")
            @NotNull(message = "O preco unitario do item e' obrigatorio")
            @DecimalMin(value = "0", message = "O preco unitario nao pode ser negativo")
            BigDecimal precoUnitario) {
    }
}
