package com.obraflow.reference;

import com.obraflow.reference.dto.ReferenceDtos.WorkInput;
import com.obraflow.reference.dto.ReferenceDtos.WorkResponse;
import com.obraflow.reference.controller.WorkController;
import com.obraflow.reference.service.ReferenceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkController.class)
class ReferenceApiTest {
    @Autowired MockMvc mvc;
    @MockitoBean ReferenceService service;

    @Test
    void rejectsInvalidWorkInputWithConsistentProblemDetails() throws Exception {
        mvc.perform(post("/api/works").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"code\":\"A\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Requisição inválida"))
                .andExpect(jsonPath("$.detail").exists());

        verifyNoInteractions(service);
    }

    @Test
    void createsAWorkThroughTheService() throws Exception {
        when(service.createWork(new WorkInput("Obra Centro", "OC-1")))
                .thenReturn(new WorkResponse(1, "Obra Centro", "OC-1"));

        mvc.perform(post("/api/works").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Obra Centro\",\"code\":\"OC-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Obra Centro"));
    }
}
