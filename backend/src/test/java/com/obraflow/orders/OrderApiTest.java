package com.obraflow.orders;

import com.obraflow.orders.controller.OrderController;
import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.DecisionRequest;
import com.obraflow.orders.OrderApprovalFlow;
import com.obraflow.orders.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
class OrderApiTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrderService service;

    @Test
    void rejectsAnOrderWithoutItemsBeforeCallingTheService() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workId\":1,\"supplierId\":2,\"orderDate\":\"2026-10-29\",\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Adicione pelo menos um item ao pedido."));

        verifyNoInteractions(service);
    }

    @Test
    void rejectsZeroQuantityWithTheItemFieldMessage() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workId":1,"supplierId":2,"orderDate":"2026-10-29","items":[
                                  {"description":"Cimento","quantity":0,"unit":"sc","unitPrice":35.00}
                                ]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A quantidade deve ser maior que zero."));

        verifyNoInteractions(service);
    }

    @Test
    void acceptsDecimalStringsUsedByTheBrowserForm() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"workId":1,"supplierId":2,"orderDate":"2026-10-29","items":[
                                  {"description":"Cimento","quantity":"1.500","unit":"sc","unitPrice":"10.25"}
                                ]}
                                """))
                .andExpect(status().isCreated());

        ArgumentCaptor<CreateOrderRequest> request = ArgumentCaptor.forClass(CreateOrderRequest.class);
        verify(service).create(request.capture());
        assertEquals(1L, request.getValue().workId());
        assertEquals(LocalDate.parse("2026-10-29"), request.getValue().orderDate());
        assertEquals(new BigDecimal("1.500"), request.getValue().items().getFirst().quantity());
        assertEquals(new BigDecimal("10.25"), request.getValue().items().getFirst().unitPrice());
    }

    @Test
    void acceptsAnApprovalDecisionRequest() throws Exception {
        mvc.perform(post("/api/orders/7/decisions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approverId\":4,\"outcome\":\"APPROVED\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<DecisionRequest> request = ArgumentCaptor.forClass(DecisionRequest.class);
        verify(service).decide(org.mockito.ArgumentMatchers.eq(7L), request.capture());
        assertEquals(4L, request.getValue().approverId());
        assertEquals(OrderApprovalFlow.Outcome.APPROVED, request.getValue().outcome());
    }

    @Test
    void hidesUnexpectedServerExceptionDetailsFromTheResponse() throws Exception {
        when(service.list()).thenThrow(new IllegalStateException("database password leaked"));

        String responseBody = mvc.perform(get("/api/orders"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value("Ocorreu um erro interno. Tente novamente."))
                .andReturn().getResponse().getContentAsString();

        assertFalse(responseBody.contains("database password leaked"));
    }
}
