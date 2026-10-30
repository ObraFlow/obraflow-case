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

import java.util.Arrays;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = EmbeddedPostgresInitializer.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AlcadaControllerIT {

    private static final String OBRA_TESTE = "11111111-1111-1111-1111-111111111111";
    private static final String NIVEL_FAIXA_BAIXA = "55555555-5555-5555-5555-555555555555";

    @Autowired
    private MockMvc mockMvc;

    /**
     * JWT simulado: o {@link AtorProvider} exige um {@code JwtAuthenticationToken} com
     * subject e claim "papeis", e o {@code @PreAuthorize} exige as autoridades ROLE_*.
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
    void deveCriarNivelDeAlcada() throws Exception {
        // Faixa fora das duas ja' existentes na obra de teste ([0,10k) e [10k,100k)).
        var request = """
                {
                    "obraId": "%s",
                    "limiteInferior": 200000,
                    "limiteSuperior": 300000,
                    "descricao": "Alto valor",
                    "usuariosAprovadores": ["%s"]
                }
                """.formatted(OBRA_TESTE, EmbeddedPostgresInitializer.usuarioSolicitante());

        mockMvc.perform(post("/api/v1/obras/{obraId}/niveis", OBRA_TESTE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.limiteInferior").value(200000))
                .andExpect(jsonPath("$.limiteSuperior").value(300000))
                .andExpect(jsonPath("$.aprovadores").isArray())
                .andExpect(jsonPath("$.aprovadores.length()").value(1));
    }

    @Test
    void deveCriarNivelSemTeto() throws Exception {
        var request = """
                {
                    "obraId": "%s",
                    "limiteInferior": 300000,
                    "limiteSuperior": null,
                    "descricao": "Acima de 300k",
                    "usuariosAprovadores": ["%s", "%s"]
                }
                """.formatted(OBRA_TESTE, EmbeddedPostgresInitializer.usuarioSolicitante(),
                EmbeddedPostgresInitializer.usuarioAprovador2());

        mockMvc.perform(post("/api/v1/obras/{obraId}/niveis", OBRA_TESTE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.limiteSuperior").doesNotExist())
                .andExpect(jsonPath("$.aprovadores.length()").value(2));
    }

    @Test
    void deveFalharAoCriarNivelComAprovadoresVazios() throws Exception {
        var request = """
                {
                    "obraId": "%s",
                    "limiteInferior": 400000,
                    "limiteSuperior": 500000,
                    "usuariosAprovadores": []
                }
                """.formatted(OBRA_TESTE);

        // Validacao do bean (@NotEmpty) responde 400, nao 422 (regra de negocio).
        mockMvc.perform(post("/api/v1/obras/{obraId}/niveis", OBRA_TESTE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request)
                        .with(autenticado("ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveListarNiveisDaObra() throws Exception {
        mockMvc.perform(get("/api/v1/obras/{obraId}/niveis", OBRA_TESTE)
                        .with(autenticado("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));
    }

    @Test
    void deveSimularCadeiaParaValor() throws Exception {
        mockMvc.perform(get("/api/v1/niveis/{nivelId}/simulacao", NIVEL_FAIXA_BAIXA)
                        .param("valor", "5000")
                        .with(autenticado("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valor").value(5000))
                .andExpect(jsonPath("$.aplicavel").isBoolean())
                .andExpect(jsonPath("$.aplicavel").value(true));
    }
}
