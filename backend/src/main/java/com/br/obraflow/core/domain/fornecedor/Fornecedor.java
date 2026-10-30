package com.br.obraflow.core.domain.fornecedor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Fornecedor destinatario do pedido de compra.
 */
public class Fornecedor {

    private final UUID id;
    private final String nome;
    private final String documento;
    private final String email;
    private final String telefone;
    private boolean ativo;
    private final Instant criadoEm;

    private Fornecedor(UUID id, String nome, String documento, String email, String telefone,
                       boolean ativo, Instant criadoEm) {
        this.id = Objects.requireNonNull(id, "id do fornecedor e' obrigatorio");
        this.nome = Objects.requireNonNull(nome, "nome do fornecedor e' obrigatorio");
        this.documento = documento == null || documento.isBlank() ? null : documento.trim();
        this.email = email == null || email.isBlank() ? null : email.trim();
        this.telefone = telefone == null || telefone.isBlank() ? null : telefone.trim();
        this.ativo = ativo;
        this.criadoEm = Objects.requireNonNull(criadoEm, "instante de criacao e' obrigatorio");
    }

    public static Fornecedor novo(UUID id, String nome, String documento, String email,
                                   String telefone, Instant criadoEm) {
        return new Fornecedor(id, nome, documento, email, telefone, true, criadoEm);
    }

    public static Fornecedor reconstituir(UUID id, String nome, String documento, String email,
                                           String telefone, boolean ativo, Instant criadoEm) {
        return new Fornecedor(id, nome, documento, email, telefone, ativo, criadoEm);
    }

    public UUID id() {
        return id;
    }

    public String nome() {
        return nome;
    }

    public String documento() {
        return documento;
    }

    public String email() {
        return email;
    }

    public String telefone() {
        return telefone;
    }

    public boolean ativo() {
        return ativo;
    }

    public Instant criadoEm() {
        return criadoEm;
    }
}
