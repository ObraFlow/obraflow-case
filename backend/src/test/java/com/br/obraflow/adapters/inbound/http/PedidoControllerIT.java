package com.br.obraflow.adapters.inbound.http;

import com.br.obraflow.EmbeddedPostgresInitializer;
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
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = EmbeddedPostgresInitializer.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PedidoControllerIT {

    @Autowired
    private MockMvc mockMvc;

    /**
     * Autenticacao via JWT simulado: o {@link AtorProvider} exige um
     * {@code JwtAuthenticationToken} com subject (uuid do usuario) e claim "papeis",
     * e o {@code @PreAuthorize} exige as autoridades ROLE_* correspondentes.
     */
    private static RequestPostProcessor autenticado(String... papeis) {
        List<GrantedAuthority> authorities = Arrays.stream(papeis)
                .map(papel -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + papel))
                .toList();
        return SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(jwt -> jwt.subject(EmbeddedPostgresInitializer.usuarioSolicitante())
                        .claim("nome", "Amanda Teste")
                        .claim("papeis", List.of(papeis)))
                .authorities(authorities.toArray(GrantedAuthority[]::new));
    }

    @Test
    void deveCriarPedidoViaEndpoint() throws Exception {
        var request = """
                {
                    "obraId": "11111111-1111-1111-1111-111111111111",
                    "fornecedorId": "22222222-2222-2222-2222-222222222222",
                    "dataPedido": "%s",
                    "observacoes": "Teste integracao",
                    "itens": [
                        {"descricao": "Cimento", "quantidade": 100, "unidade": "sc", "precoUnitario": 32.90},
                        {"descricao": "Areia", "quantidade": 30, "unidade": "m3", "precoUnitario": 95.00}
                    ]
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(post("/api/v1/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.numero").exists())
                .andExpect(jsonPath("$.valorTotal").value(6140.00))
                .andExpect(jsonPath("$.situacao").value("PENDENTE"))
                .andExpect(jsonPath("$.etapaAtual").value(1));
    }

    @Test
    void deveFalharAoCriarPedidoSemItens() throws Exception {
        var request = """
                {
                    "obraId": "11111111-1111-1111-1111-111111111111",
                    "fornecedorId": "22222222-2222-2222-2222-222222222222",
                    "dataPedido": "%s",
                    "itens": []
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(post("/api/v1/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveFalharAoCriarPedidoComQuantidadeInvalida() throws Exception {
        var request = """
                {
                    "obraId": "11111111-1111-1111-1111-111111111111",
                    "fornecedorId": "22222222-2222-2222-2222-222222222222",
                    "dataPedido": "%s",
                    "itens": [
                        {"descricao": "Item", "quantidade": -1, "unidade": "un", "precoUnitario": 10}
                    ]
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(post("/api/v1/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveListarPedidos() throws Exception {
        mockMvc.perform(get("/api/v1/pedidos")
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conteudo").isArray())
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamanho").value(20));
    }

    @Test
    void deveFiltrarPedidosPorSituacao() throws Exception {
        mockMvc.perform(get("/api/v1/pedidos")
                        .param("situacao", "PENDENTE")
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conteudo").isArray());
    }

    @Test
    void deveExcluirPedidoPendenteViaEndpoint() throws Exception {
        var request = """
                {
                    "obraId": "11111111-1111-1111-1111-111111111111",
                    "fornecedorId": "22222222-2222-2222-2222-222222222222",
                    "dataPedido": "%s",
                    "itens": [
                        {"descricao": "Item", "quantidade": 1, "unidade": "un", "precoUnitario": 10}
                    ]
                }
                """.formatted(LocalDate.now());

        String corpo = mockMvc.perform(post("/api/v1/pedidos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String pedidoId = com.jayway.jsonpath.JsonPath.read(corpo, "$.id");

        mockMvc.perform(delete("/api/v1/pedidos/" + pedidoId)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/pedidos/" + pedidoId)
                        .with(autenticado("COMPRADOR")))
                .andExpect(status().isNotFound());
    }

    @Test
    void naoDeveExcluirPedidoSemPapelDeComprador() throws Exception {
        mockMvc.perform(delete("/api/v1/pedidos/" + UUID.randomUUID())
                        .with(autenticado("APROVADOR")))
                .andExpect(status().isForbidden());
    }
}