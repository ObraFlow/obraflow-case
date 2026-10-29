package com.obraflow.reference;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReferenceController.class)
class ReferenceApiTest {
    @Autowired MockMvc mvc;
    @MockitoBean JdbcTemplate jdbc;

    @Test
    void rejectsMissingRequiredWorkFields() throws Exception {
        mvc.perform(post("/api/works").contentType("application/json").content("{\"name\":\"\",\"code\":\"A\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returnsNotFoundForRulesOfUnknownWork() throws Exception {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyLong())).thenReturn(0);
        mvc.perform(get("/api/works/99/approval-bands")).andExpect(status().isNotFound());
    }
}
