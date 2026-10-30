package com.br.obraflow.bootstrap;

import com.br.obraflow.core.application.dto.command.DecisaoComando;
import com.br.obraflow.core.application.dto.command.FornecedorComando;
import com.br.obraflow.core.application.dto.command.ItemPedidoComando;
import com.br.obraflow.core.application.dto.command.NivelAlcadaComando;
import com.br.obraflow.core.application.dto.command.ObraComando;
import com.br.obraflow.core.application.dto.command.PedidoComando;
import com.br.obraflow.core.application.dto.command.UsuarioComando;
import com.br.obraflow.core.application.dto.result.FornecedorResultado;
import com.br.obraflow.core.application.dto.result.ObraResultado;
import com.br.obraflow.core.application.dto.result.PedidoResultado;
import com.br.obraflow.core.application.dto.result.UsuarioResultado;
import com.br.obraflow.core.application.port.in.AlcadaUseCase;
import com.br.obraflow.core.application.port.in.FornecedorUseCase;
import com.br.obraflow.core.application.port.in.ObraUseCase;
import com.br.obraflow.core.application.port.in.PedidoUseCase;
import com.br.obraflow.core.application.port.in.UsuarioUseCase;
import com.br.obraflow.core.domain.pedido.Ator;
import com.br.obraflow.core.domain.pedido.TipoDecisao;
import com.br.obraflow.core.domain.usuario.Papel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Carrega o cenario de demonstracao do desafio.
 * <p>
 * Tudo e' criado atraves dos casos de uso (portas de entrada), exatamente como a API
 * faria - nenhum INSERT direto no banco. Assim o seed exercita as mesmas regras de
 * negocio (faixas sem sobreposicao, totais calculados, cadeia materializada).
 */
@Component
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true", matchIfMissing = true)
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final ObraUseCase obras;
    private final UsuarioUseCase usuarios;
    private final FornecedorUseCase fornecedores;
    private final AlcadaUseCase alcadas;
    private final PedidoUseCase pedidos;
    private final String senhaPadrao;

    public DemoDataSeeder(ObraUseCase obras,
                          UsuarioUseCase usuarios,
                          FornecedorUseCase fornecedores,
                          AlcadaUseCase alcadas,
                          PedidoUseCase pedidos,
                          @Value("${app.demo.senha-padrao}") String senhaPadrao) {
        this.obras = obras;
        this.usuarios = usuarios;
        this.fornecedores = fornecedores;
        this.alcadas = alcadas;
        this.pedidos = pedidos;
        this.senhaPadrao = senhaPadrao;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!obras.listar().isEmpty()) {
            LOG.info("Cenario de demonstracao ja' carregado - nada a fazer.");
            return;
        }

        LOG.info("Carregando cenario de demonstracao do ObraFlow...");

        UsuarioResultado amanda = criarUsuario("Amanda Souza", "amanda.souza@obraflow.com.br",
                "Engenheira de obras", Set.of(Papel.ADMIN, Papel.APROVADOR));
        UsuarioResultado joao = criarUsuario("Joao Pedro Lima", "joao.lima@obraflow.com.br",
                "Diretor de engenharia", Set.of(Papel.APROVADOR));
        UsuarioResultado patricia = criarUsuario("Patricia Rocha", "patricia.rocha@obraflow.com.br",
                "Gerente de suprimentos", Set.of(Papel.APROVADOR));
        UsuarioResultado bruno = criarUsuario("Bruno Alves", "bruno.alves@obraflow.com.br",
                "Controller financeiro", Set.of(Papel.APROVADOR));
        UsuarioResultado carlos = criarUsuario("Carlos Menezes", "carlos.menezes@obraflow.com.br",
                "Comprador", Set.of(Papel.COMPRADOR));
        criarUsuario("Rafael Nunes", "rafael.nunes@obraflow.com.br",
                "Analista de compras", Set.of(Papel.COMPRADOR));
        criarUsuario("Marcos Vieira", "marcos.vieira@obraflow.com.br",
                "Administrador do sistema", Set.of(Papel.ADMIN));

        ObraResultado horizonte = criarObra("OBRA-001", "Edificio Horizonte",
                "Av. Paulista, 1000 - Sao Paulo/SP");
        ObraResultado vilaNova = criarObra("OBRA-002", "Residencia Vila Nova",
                "Rua das Acacias, 250 - Campinas/SP");
        ObraResultado reformaCentro = criarObra("OBRA-003", "Reforma Centro Historico",
                "Praca da Matriz, 15 - Santos/SP");

        FornecedorResultado cimentos = criarFornecedor("Cimentos ABC Ltda", "12.345.678/0001-90",
                "comercial@cimentoabc.com.br", "(11) 3555-1020");
        FornecedorResultado ferragens = criarFornecedor("Ferragens Silva & Cia", "98.765.432/0001-11",
                "vendas@ferragenssilva.com.br", "(11) 3444-5566");
        criarFornecedor("Pisos e Revestimentos Norte", "45.612.333/0001-77",
                "contato@pisosnorte.com.br", "(11) 3333-7788");

        // OBRA-001: a tabela do enunciado - faixa de 0 a 10.000 (Amanda) e acima de 10.000 (Amanda -> Joao).
        criarNivel(horizonte.id(), "0", "10000", "Compras de pequeno valor", List.of(amanda.id()));
        criarNivel(horizonte.id(), "10000", null, "Compras acima de 10.000",
                List.of(amanda.id(), joao.id()));

        criarNivel(vilaNova.id(), "0", "5000", "Compras de rotina", List.of(patricia.id()));
        criarNivel(vilaNova.id(), "5000", null, "Compras acima de 5.000",
                List.of(patricia.id(), bruno.id()));

        criarNivel(reformaCentro.id(), "0", "25000", "Compras de pequeno e medio porte",
                List.of(bruno.id()));
        criarNivel(reformaCentro.id(), "25000", null, "Compras acima de 25.000",
                List.of(amanda.id(), joao.id(), patricia.id()));

        Ator comprador = ator(carlos);
        Ator atorAmanda = ator(amanda);
        Ator atorJoao = ator(joao);
        Ator atorPatricia = ator(patricia);

        // Pedido aguardando a primeira decisao da Amanda (faixa de 0 a 10.000).
        PedidoResultado pendenteSimples = criarPedido(comprador, horizonte.id(), cimentos.id(),
                LocalDate.now().minusDays(2), "Cimento e concreto para fundacao",
                item("Cimento CP II - 50kg", "120", "sc", "32.90"),
                item("Areia lavada", "30", "m3", "95.00"));
        LOG.info("Pedido {} criado - aguardando decisao de {}", pendenteSimples.numero(), amanda.nome());

        // Pedido que ja' passou pela Amanda e aguarda o Joao (faixa acima de 10.000).
        PedidoResultado pendenteDuplo = criarPedido(comprador, horizonte.id(), ferragens.id(),
                LocalDate.now().minusDays(1), "Estrutura metalica",
                item("Perfil W 200", "60", "pc", "420.00"),
                item("Parafuso estrutural", "800", "un", "3.25"));
        aprovar(pendenteDuplo, atorAmanda);
        LOG.info("Pedido {} criado - etapa 1 aprovada, aguardando {}", pendenteDuplo.numero(), joao.nome());

        // Pedido aprovado por completo (cadeia de tres etapas).
        PedidoResultado aprovado = criarPedido(comprador, reformaCentro.id(), cimentos.id(),
                LocalDate.now().minusDays(6), "Reforma da fachada",
                item("Revestimento porcelanato", "450", "m2", "189.90"),
                item("Mao de obra pintura", "120", "h", "85.00"));
        aprovar(aprovado, atorAmanda);
        aprovar(aprovado, atorJoao);
        aprovar(aprovado, atorPatricia);
        LOG.info("Pedido {} criado - aprovado pelas tres etapas", aprovado.numero());

        // Pedido rejeitado com motivo.
        PedidoResultado rejeitado = criarPedido(comprador, vilaNova.id(), cimentos.id(),
                LocalDate.now().minusDays(3), "Material para cozinha",
                item("Geladeira", "2", "un", "3200.00"));
        pedidos.registrarDecisao(rejeitado.id(),
                new DecisaoComando(TipoDecisao.REJEITADO,
                        "Valor acima do orcamento aprovado para esta obra."),
                atorPatricia);
        LOG.info("Pedido {} criado - rejeitado pela {}", rejeitado.numero(), patricia.nome());

        // Pedido aguardando a Patricia (faixa de 0 a 5.000 da OBRA-002).
        PedidoResultado pendentePatricia = criarPedido(comprador, vilaNova.id(), ferragens.id(),
                LocalDate.now(), "Metais e loucas",
                item("Torneira cromada", "15", "un", "289.00"));
        LOG.info("Pedido {} criado - aguardando decisao de {}", pendentePatricia.numero(), patricia.nome());

        // Pedido aguardando o Bruno (faixa de 0 a 25.000 da OBRA-003).
        PedidoResultado pendenteBruno = criarPedido(comprador, reformaCentro.id(), cimentos.id(),
                LocalDate.now(), "Pisos do terreo",
                item("Porcelanato retangular", "150", "m2", "149.90"));
        LOG.info("Pedido {} criado - aguardando decisao de {}", pendenteBruno.numero(), bruno.nome());

        LOG.info("Cenario de demonstracao carregado: 3 obras, 6 faixas, 7 usuarios e 6 pedidos.");
    }

    private void aprovar(PedidoResultado pedido, Ator ator) {
        pedidos.registrarDecisao(pedido.id(), new DecisaoComando(TipoDecisao.APROVADO, null), ator);
    }

    private Ator ator(UsuarioResultado usuario) {
        return Ator.de(usuario.id(), usuario.nome(), usuario.papeis());
    }

    private UsuarioResultado criarUsuario(String nome, String email, String cargo, Set<Papel> papeis) {
        return usuarios.criar(new UsuarioComando(nome, email, senhaPadrao, cargo, papeis));
    }

    private ObraResultado criarObra(String codigo, String nome, String endereco) {
        return obras.criar(new ObraComando(codigo, nome, endereco));
    }

    private FornecedorResultado criarFornecedor(String nome, String documento, String email, String telefone) {
        return fornecedores.criar(new FornecedorComando(nome, documento, email, telefone));
    }

    private void criarNivel(UUID obraId, String inferior, String superior, String descricao,
                            List<UUID> aprovadores) {
        alcadas.criarNivel(new NivelAlcadaComando(
                obraId,
                new BigDecimal(inferior),
                superior == null ? null : new BigDecimal(superior),
                descricao,
                aprovadores));
    }

    private PedidoResultado criarPedido(Ator comprador, UUID obraId, UUID fornecedorId,
                                        LocalDate data, String observacoes, ItemPedidoComando... itens) {
        return pedidos.criar(new PedidoComando(obraId, fornecedorId, data, observacoes, List.of(itens)),
                comprador);
    }

    private ItemPedidoComando item(String descricao, String quantidade, String unidade, String preco) {
        return new ItemPedidoComando(descricao, new BigDecimal(quantidade), unidade, new BigDecimal(preco));
    }
}
