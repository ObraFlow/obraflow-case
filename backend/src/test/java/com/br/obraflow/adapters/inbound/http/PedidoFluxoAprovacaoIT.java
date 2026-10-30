package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.EmbeddedPostgresInitializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fluxo de aprovacao ponta a ponta via HTTP.
 * <p>
 * A base de teste (ver {@link EmbeddedPostgresInitializer}) tem, para a obra 11111111:
 * <ul>
 *     <li>faixa [0, 10k)   -> 1 etapa: Amanda (33333333);</li>
 *     <li>faixa [10k, 100k) -> 2 etapas: Amanda (33333333) e Joao (44444444).</li>
 * </ul>
 * Como o {@link AtorProvider} deriva o ator do JWT, cada chamada usa o subject do
 * aprovador que deve estar decidindo naquela etapa.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = EmbeddedPostgresInitializer.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PedidoFluxoAprovacaoIT {

    private static final String AMANDA = EmbeddedPostgresInitializer.usuarioSolicitante();
    private static final String JOAO = EmbeddedPostgresInitializer.usuarioAprovador2();

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static RequestPostProcessor autenticadoComo(String usuarioId, String... papeis) {
        List<GrantedAuthority> authorities = Arrays.stream(papeis)
                .map(papel -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + papel))
                .toList();
        return SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(jwt -> jwt.subject(usuarioId)
                        .claim("nome", "Usuario Teste")
                        .claim("papeis", List.of(papeis)))
                .authorities(authorities.toArray(GrantedAuthority[]::new));
    }

    private String criarPedido(String descricao, String quantidade, String preco) throws Exception {
        var request = """
                {
                    "obraId": "11111111-1111-1111-1111-111111111111",
                    "fornecedorId": "22222222-2222-2222-2222-222222222222",
                    "dataPedido": "%s",
                    "observacoes": "%s",
                    "itens": [
                        {"descricao": "Item", "quantidade": %s, "unidade": "un", "precoUnitario": %s}
                    ]
                }
                """.formatted(LocalDate.now(), descricao, quantidade, preco);

        String response = mockMvc.perform(post("/api/v1/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticadoComo(AMANDA, "COMPRADOR")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("id").asText();
    }

    @Test
    void deveCompletarFluxoDeAprovacaoSimples() throws Exception {
        String pedidoId = criarPedido("Fluxo aprovacao simples", "10", "32.90");

        // 1 etapa: Amanda decide
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("APROVADO"))
                .andExpect(jsonPath("$.etapaAtual").value(1))
                .andExpect(jsonPath("$.totalEtapas").value(1));

        // cadeia concluida: nao ha' etapa corrente para decidir
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deveCompletarFluxoDeAprovacaoMultiplasEtapas() throws Exception {
        // 60 x 420 = 25.200 -> faixa [10k, 100k) com 2 aprovadores
        String pedidoId = criarPedido("Fluxo duas etapas", "60", "420.00");

        mockMvc.perform(get("/api/v1/pedidos/{id}", pedidoId)
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEtapas").value(2));

        // Etapa 1: Amanda aprova
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("PENDENTE"))
                .andExpect(jsonPath("$.etapaAtual").value(2));

        // Etapa 2: Joao aprova
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(JOAO, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("APROVADO"))
                .andExpect(jsonPath("$.etapaAtual").value(2));
    }

    @Test
    void deveRejeitarPedidoEInterromperFluxo() throws Exception {
        String pedidoId = criarPedido("Pedido para rejeicao", "1", "50000");

        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"decisao": "REJEITADO", "motivo": "Valor acima do orcamento aprovado"}""")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("REJEITADO"))
                .andExpect(jsonPath("$.alcada.etapas[0].motivo").value("Valor acima do orcamento aprovado"));

        // fluxo interrompido: ninguem mais decide
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deveFalharQuandoAprovadorTentaDecidirForaDaOrdem() throws Exception {
        String pedidoId = criarPedido("Fora de ordem", "60", "420.00");

        // Joao e' a 2a etapa, mas a 1a (Amanda) ainda nao decidiu
        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(JOAO, "APROVADOR")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void deveFalharAoRejeitarSemMotivo() throws Exception {
        String pedidoId = criarPedido("Rejeicao sem motivo", "1", "100");

        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"REJEITADO\", \"motivo\": \"\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("motivo")));
    }

    @Test
    void deveRetornarDetalhesComHistoricoDeDecisoes() throws Exception {
        String pedidoId = criarPedido("Historico de decisoes", "1", "100");

        mockMvc.perform(post("/api/v1/pedidos/{id}/decisoes", pedidoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decisao\": \"APROVADO\"}")
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/pedidos/{id}", pedidoId)
                        .with(autenticadoComo(AMANDA, "APROVADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alcada.etapas").isArray())
                .andExpect(jsonPath("$.alcada.etapas[0].situacao").value("APROVADO"))
                .andExpect(jsonPath("$.alcada.etapas[0].decididoEm").exists())
                .andExpect(jsonPath("$.alcada.aprovadorAtual").doesNotExist());
    }
}
