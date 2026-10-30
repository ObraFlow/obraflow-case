package com.obraflow.reference;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises reference-data APIs and approval-rule persistence against PostgreSQL. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
class ReferenceDataIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine")
            .withDatabaseName("obraflow_reference_test")
            .withUsername("obraflow")
            .withPassword("obraflow_test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @Test
    void createsAndListsWorksUsersAndSuppliersThroughTheApi() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String workName = "Obra API " + suffix;
        String workCode = "API-" + suffix;
        long workId = create("/api/works", "{\"name\":\"" + workName + "\",\"code\":\"" + workCode + "\"}");
        long userId = create("/api/users", "{\"name\":\"Ana " + suffix + "\",\"email\":\"ana-" + suffix + "@example.test\"}");
        long supplierId = create("/api/suppliers", "{\"name\":\"Fornecedor " + suffix + "\",\"taxId\":\"TAX-" + suffix + "\"}");

        JsonNode works = getArray("/api/works");
        JsonNode users = getArray("/api/users");
        JsonNode suppliers = getArray("/api/suppliers");

        assertTrue(hasId(works, workId));
        assertTrue(hasId(users, userId));
        assertTrue(hasId(suppliers, supplierId));
        assertEquals(workName, findById(works, workId).get("name").asText());
    }

    @Test
    void persistsRuleBandsAndOrderedApproversPerWorkAcrossCreateUpdateAndRemoval() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        long firstWork = insertWork("Faixas 1 " + suffix, "B1-" + suffix);
        long secondWork = insertWork("Faixas 2 " + suffix, "B2-" + suffix);
        long ana = insertUser("Ana " + suffix, "ana-" + suffix + "@example.test");
        long bia = insertUser("Bia " + suffix, "bia-" + suffix + "@example.test");
        long caio = insertUser("Caio " + suffix, "caio-" + suffix + "@example.test");

        String initial = "["
                + "{\"minAmount\":0,\"maxAmount\":10000,\"approverIds\":[" + ana + "," + bia + "]},"
                + "{\"minAmount\":10000,\"maxAmount\":null,\"approverIds\":[" + caio + "]}]";
        mvc.perform(put("/api/works/{id}/approval-bands", firstWork).contentType(MediaType.APPLICATION_JSON).content(initial))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].minAmount").value(0))
                .andExpect(jsonPath("$[0].maxAmount").value(10000))
                .andExpect(jsonPath("$[0].approvers[0].id").value(ana))
                .andExpect(jsonPath("$[0].approvers[1].id").value(bia))
                .andExpect(jsonPath("$[1].approvers[0].id").value(caio));

        mvc.perform(get("/api/works/{id}/approval-bands", firstWork))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].position").value(1))
                .andExpect(jsonPath("$[0].approvers[1].position").value(2));
        mvc.perform(get("/api/works/{id}/approval-bands", secondWork))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));

        String updated = "[{\"minAmount\":0,\"maxAmount\":null,\"approverIds\":[" + caio + "," + ana + "]}]";
        mvc.perform(put("/api/works/{id}/approval-bands", firstWork).contentType(MediaType.APPLICATION_JSON).content(updated))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].approvers[0].id").value(caio))
                .andExpect(jsonPath("$[0].approvers[1].id").value(ana));

        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM approval_bands WHERE work_id=?", Integer.class, firstWork));
        assertEquals(new BigDecimal("0.00"), jdbc.queryForObject("SELECT min_amount FROM approval_bands WHERE work_id=?", BigDecimal.class, firstWork));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM approval_band_approvers a JOIN approval_bands b ON b.id=a.band_id WHERE b.work_id=?", Integer.class, firstWork));
        assertEquals(caio, jdbc.queryForObject("SELECT user_id FROM approval_band_approvers a JOIN approval_bands b ON b.id=a.band_id WHERE b.work_id=? AND a.position=1", Long.class, firstWork));

        String secondWorkRule = "[{\"minAmount\":0,\"maxAmount\":null,\"approverIds\":[" + bia + "]}]";
        mvc.perform(put("/api/works/{id}/approval-bands", secondWork).contentType(MediaType.APPLICATION_JSON).content(secondWorkRule))
                .andExpect(status().isOk());
        assertEquals(caio, jdbc.queryForObject("SELECT user_id FROM approval_band_approvers a JOIN approval_bands b ON b.id=a.band_id WHERE b.work_id=? AND a.position=1", Long.class, firstWork));
        assertEquals(bia, jdbc.queryForObject("SELECT user_id FROM approval_band_approvers a JOIN approval_bands b ON b.id=a.band_id WHERE b.work_id=? AND a.position=1", Long.class, secondWork));
    }

    @Test
    void invalidBandReplacementReturnsBadRequestAndLeavesPersistedConfigurationUntouched() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        long work = insertWork("Faixa inválida " + suffix, "INVALID-" + suffix);
        long user = insertUser("Usuário " + suffix, "user-" + suffix + "@example.test");
        String valid = "[{\"minAmount\":0,\"maxAmount\":null,\"approverIds\":[" + user + "]}]";
        mvc.perform(put("/api/works/{id}/approval-bands", work).contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isOk());

        String gap = "["
                + "{\"minAmount\":0,\"maxAmount\":100,\"approverIds\":[" + user + "]},"
                + "{\"minAmount\":101,\"maxAmount\":null,\"approverIds\":[" + user + "]}]";
        mvc.perform(put("/api/works/{id}/approval-bands", work).contentType(MediaType.APPLICATION_JSON).content(gap))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/works/{id}/approval-bands", work))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].maxAmount").value(org.hamcrest.Matchers.nullValue()));
    }

    private long create(String path, String body) throws Exception {
        MvcResult result = mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private JsonNode getArray(String path) throws Exception {
        MvcResult result = mvc.perform(get(path)).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private boolean hasId(JsonNode items, long id) {
        for (JsonNode item : items) if (item.path("id").asLong() == id) return true;
        return false;
    }

    private JsonNode findById(JsonNode items, long id) {
        for (JsonNode item : items) if (item.path("id").asLong() == id) return item;
        throw new AssertionError("Expected API item with id " + id);
    }

    private long insertWork(String name, String code) {
        return jdbc.queryForObject("INSERT INTO works(name,code) VALUES (?,?) RETURNING id", Long.class, name, code);
    }

    private long insertUser(String name, String email) {
        return jdbc.queryForObject("INSERT INTO app_users(name,email) VALUES (?,?) RETURNING id", Long.class, name, email);
    }
}
