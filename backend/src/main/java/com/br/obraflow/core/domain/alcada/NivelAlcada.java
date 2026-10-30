package com.br.obraflow.core.domain.alcada;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Aggregate root da configuracao de alcada de uma obra.
 * <p>
 * Um nivel define a faixa de valores que ele atende e a <b>cadeia ordenada</b> de
 * aprovadores que deve decidir os pedidos cujo total caiu nessa faixa.
 */
public class NivelAlcada {

    private final UUID id;
    private final UUID obraId;
    private FaixaValor faixa;
    private String descricao;
    private final List<AprovadorNivel> aprovadores;

    private NivelAlcada(UUID id, UUID obraId, FaixaValor faixa, String descricao,
                        List<AprovadorNivel> aprovadores) {
        this.id = id;
        this.obraId = obraId;
        this.faixa = faixa;
        this.descricao = descricao;
        this.aprovadores = new ArrayList<>(aprovadores);
    }

    public static NivelAlcada novo(UUID id, UUID obraId, FaixaValor faixa, String descricao,
                                   List<UUID> usuariosAprovadores) {
        return new NivelAlcada(id, obraId, faixa, descricao, montarAprovadores(usuariosAprovadores));
    }

    /**
     * Reconstitui um nivel ja' persistido (uso dos adaptadores de saida).
     */
    public static NivelAlcada reconstituir(UUID id, UUID obraId, FaixaValor faixa, String descricao,
                                           List<AprovadorNivel> aprovadores) {
        return new NivelAlcada(id, obraId, faixa, descricao, aprovadores);
    }

    /**
     * Substitui a cadeia de aprovadores. A ordem da lista recebida e' a nova ordem
     * do fluxo - e' assim que a reordenacao e' expressa na API.
     */
    public void redefinirAprovadores(List<UUID> usuariosAprovadores) {
        this.aprovadores.clear();
        this.aprovadores.addAll(montarAprovadores(usuariosAprovadores));
    }

    public void alterarFaixa(FaixaValor novaFaixa) {
        this.faixa = novaFaixa;
    }

    public void alterarDescricao(String novaDescricao) {
        this.descricao = novaDescricao;
    }

    public boolean contem(BigDecimal valor) {
        return faixa.contem(valor);
    }

    public UUID id() {
        return id;
    }

    public UUID obraId() {
        return obraId;
    }

    public FaixaValor faixa() {
        return faixa;
    }

    public String descricao() {
        return descricao;
    }

    public List<AprovadorNivel> aprovadores() {
        return List.copyOf(aprovadores);
    }

    /** Identificadores dos aprovadores na ordem do fluxo. */
    public List<UUID> usuariosAprovadores() {
        return aprovadores.stream().map(AprovadorNivel::usuarioId).toList();
    }

    private static List<AprovadorNivel> montarAprovadores(List<UUID> usuariosAprovadores) {
        if (usuariosAprovadores == null || usuariosAprovadores.isEmpty()) {
            throw new ArgumentoInvalidoException("Um nivel de alcada deve possuir ao menos um aprovador.");
        }
        Set<UUID> distintos = new HashSet<>();
        List<AprovadorNivel> aprovadores = new ArrayList<>();
        int ordem = 1;
        for (UUID usuario : usuariosAprovadores) {
            if (usuario == null) {
                throw new ArgumentoInvalidoException("Aprovador nao pode ser nulo.");
            }
            if (!distintos.add(usuario)) {
                throw new ArgumentoInvalidoException(
                        "O mesmo usuario nao pode aparecer duas vezes na cadeia de aprovadores do nivel.");
            }
            aprovadores.add(new AprovadorNivel(usuario, ordem++));
        }
        return aprovadores;
    }
}
