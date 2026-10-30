package com.br.obraflow.core.domain.obra;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Obra (projeto) da construcao civil. E' o contexto de configuracao das alcadas:
 * cada obra possui suas proprias faixas de valor e cadeias de aprovacao.
 */
public class Obra {

    private final UUID id;
    private final String codigo;
    private final String nome;
    private final String endereco;
    private StatusObra status;
    private final Instant criadoEm;

    private Obra(UUID id, String codigo, String nome, String endereco, StatusObra status, Instant criadoEm) {
        this.id = Objects.requireNonNull(id, "id da obra e' obrigatorio");
        this.codigo = validarCodigo(codigo);
        this.nome = Objects.requireNonNull(nome, "nome da obra e' obrigatorio");
        this.endereco = endereco == null || endereco.isBlank() ? null : endereco.trim();
        this.status = status == null ? StatusObra.ATIVA : status;
        this.criadoEm = Objects.requireNonNull(criadoEm, "instante de criacao e' obrigatorio");
    }

    public static Obra nova(UUID id, String codigo, String nome, String endereco, Instant criadoEm) {
        return new Obra(id, codigo, nome, endereco, StatusObra.ATIVA, criadoEm);
    }

    public static Obra reconstituir(UUID id, String codigo, String nome, String endereco,
                                     StatusObra status, Instant criadoEm) {
        return new Obra(id, codigo, nome, endereco, status, criadoEm);
    }

    private static String validarCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new ArgumentoInvalidoException("O codigo da obra e' obrigatorio.");
        }
        return codigo.trim().toUpperCase();
    }

    public void desativar() {
        this.status = StatusObra.INATIVA;
    }

    public void ativar() {
        this.status = StatusObra.ATIVA;
    }

    public UUID id() {
        return id;
    }

    public String codigo() {
        return codigo;
    }

    public String nome() {
        return nome;
    }

    public String endereco() {
        return endereco;
    }

    public StatusObra status() {
        return status;
    }

    public Instant criadoEm() {
        return criadoEm;
    }
}
