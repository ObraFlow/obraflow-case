package com.obraflow.health;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HealthControllerTest {

    @Test
    void reportsApiAndDatabaseAsUpAfterSuccessfulQuery() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
        HealthService service = new HealthService(jdbcTemplate);

        Map<String, String> result = service.health();

        assertEquals(Map.of("status", "UP", "database", "UP"), result);
        verify(jdbcTemplate).queryForObject("SELECT 1", Integer.class);
    }
}
