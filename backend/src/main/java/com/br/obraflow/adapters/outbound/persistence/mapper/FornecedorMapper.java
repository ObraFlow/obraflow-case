package com.br.obraflow.adapters.outbound.persistence.mapper;

import com.br.obraflow.adapters.outbound.persistence.entity.FornecedorEntity;
import com.br.obraflow.core.domain.fornecedor.Fornecedor;

/**
 * Conversao entre a entidade de persistencia e o agregado de dominio {@link Fornecedor}.
 */
public final class FornecedorMapper {

    private FornecedorMapper() {
    }

    public static Fornecedor toDomain(FornecedorEntity entity) {
        return Fornecedor.reconstituir(
                entity.getId(),
                entity.getNome(),
                entity.getDocumento(),
                entity.getEmail(),
                entity.getTelefone(),
                entity.isAtivo(),
                entity.getCriadoEm());
    }

    public static void apply(Fornecedor domain, FornecedorEntity entity) {
        entity.setNome(domain.nome());
        entity.setDocumento(domain.documento());
        entity.setEmail(domain.email());
        entity.setTelefone(domain.telefone());
        entity.setAtivo(domain.ativo());
    }
}
