package com.br.obraflow.core.domain.usuario;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;


public class Usuario {

    private final UUID id;
    private final String nome;
    private final String email;
    private final String senhaHash;
    private final String cargo;
    private final boolean ativo;
    private final Set<Papel> papeis;
    private final Instant criadoEm;

    private Usuario(UUID id, String nome, String email, String senhaHash, String cargo,
                    boolean ativo, Set<Papel> papeis, Instant criadoEm) {
        this.id = Objects.requireNonNull(id, "id do usuario e' obrigatorio");
        this.nome = Objects.requireNonNull(nome, "nome do usuario e' obrigatorio");
        this.email = Objects.requireNonNull(email, "email do usuario e' obrigatorio");
        this.senhaHash = Objects.requireNonNull(senhaHash, "senha do usuario e' obrigatoria");
        this.cargo = cargo;
        this.ativo = ativo;
        this.papeis = papeis.isEmpty() ? EnumSet.noneOf(Papel.class) : EnumSet.copyOf(papeis);
        this.criadoEm = Objects.requireNonNull(criadoEm, "instante de criacao e' obrigatorio");
    }

    public static Usuario novo(UUID id, String nome, String email, String senhaHash, String cargo,
                               Set<Papel> papeis, Instant criadoEm) {
        return new Usuario(id, nome, email, senhaHash, cargo, true, papeis, criadoEm);
    }

    public static Usuario reconstituir(UUID id, String nome, String email, String senhaHash, String cargo,
                                        boolean ativo, Set<Papel> papeis, Instant criadoEm) {
        return new Usuario(id, nome, email, senhaHash, cargo, ativo, papeis, criadoEm);
    }

    public UUID id() {
        return id;
    }

    public String nome() {
        return nome;
    }

    public String email() {
        return email;
    }

    public String senhaHash() {
        return senhaHash;
    }

    public String cargo() {
        return cargo;
    }

    public boolean ativo() {
        return ativo;
    }

    public Set<Papel> papeis() {
        return Set.copyOf(papeis);
    }

    public Instant criadoEm() {
        return criadoEm;
    }
}
