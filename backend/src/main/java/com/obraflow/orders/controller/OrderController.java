package com.obraflow.orders.controller;

import com.obraflow.orders.dto.OrderDtos.CreateOrderRequest;
import com.obraflow.orders.dto.OrderDtos.DecisionRequest;
import com.obraflow.orders.dto.OrderDtos.OrderResponse;
import com.obraflow.orders.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes order creation and read operations. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService service;

    public OrderController(OrderService service) { this.service = service; }

    @GetMapping
    public List<OrderResponse> list() { return service.list(); }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable long id) { return service.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) { return service.create(request); }

    @PostMapping("/{id}/decisions")
    public OrderResponse decide(@PathVariable long id, @Valid @RequestBody DecisionRequest request) {
        return service.decide(id, request);
    }
}
