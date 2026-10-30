package com.br.obraflow.adapters.inbound.http.handler;

import com.br.obraflow.core.domain.exception.ArgumentoInvalidoException;
import com.br.obraflow.core.domain.exception.ConflitoException;
import com.br.obraflow.core.domain.exception.EntidadeNaoEncontradaException;
import com.br.obraflow.core.domain.exception.RegraDeNegocioException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Tradutor de excecoes em respostas RFC 7807 (ProblemDetail).
 * <p>
 * O nucleo de dominio nao conhece HTTP: ele lanca excecoes de negocio e este
 * componente decide o status code e o formato padronizado da resposta.
 */
@RestControllerAdvice
public class ErroGlobalHandler {

    private static final String BASE_URI = "https://obraflow.com.br/problemas/";

    @ExceptionHandler(ArgumentoInvalidoException.class)
    public ResponseEntity<ProblemDetail> argumentoInvalido(ArgumentoInvalidoException excecao,
                                                            HttpServletRequest request) {
        return resposta(HttpStatus.BAD_REQUEST, "Argumento invalido", "argumento-invalido",
                excecao.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> validacaoDeCampos(MethodArgumentNotValidException excecao,
                                                            HttpServletRequest request) {
        List<Map<String, String>> erros = excecao.getBindingResult().getFieldErrors().stream()
                .map(ErroGlobalHandler::descrever)
                .toList();

        ProblemDetail problema = criar(HttpStatus.BAD_REQUEST, "Dados invalidos", "dados-invalidos",
                "Um ou mais campos invalidos.", request);
        problema.setProperty("erros", erros);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problema);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> violacaoDeConstraint(ConstraintViolationException excecao,
                                                                HttpServletRequest request) {
        List<Map<String, String>> erros = excecao.getConstraintViolations().stream()
                .map(violacao -> Map.of(
                        "campo", violacao.getPropertyPath().toString(),
                        "mensagem", violacao.getMessage()))
                .toList();

        ProblemDetail problema = criar(HttpStatus.BAD_REQUEST, "Dados invalidos", "dados-invalidos",
                "Um ou mais campos invalidos.", request);
        problema.setProperty("erros", erros);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problema);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    public ResponseEntity<ProblemDetail> requisicaoMalFormada(Exception excecao,
                                                                HttpServletRequest request) {
        return resposta(HttpStatus.BAD_REQUEST, "Requisicao invalida", "requisicao-invalida",
                "O corpo ou os parametros da requisicao nao' puderam ser lidos.", request);
    }

    @ExceptionHandler(EntidadeNaoEncontradaException.class)
    public ResponseEntity<ProblemDetail> naoEncontrado(EntidadeNaoEncontradaException excecao,
                                                        HttpServletRequest request) {
        return resposta(HttpStatus.NOT_FOUND, "Recurso nao encontrado", "nao-encontrado",
                excecao.getMessage(), request);
    }

    @ExceptionHandler(ConflitoException.class)
    public ResponseEntity<ProblemDetail> conflito(ConflitoException excecao,
                                                  HttpServletRequest request) {
        return resposta(HttpStatus.CONFLICT, "Conflito de estado", "conflito",
                excecao.getMessage(), request);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> concorrencia(OptimisticLockingFailureException excecao,
                                                       HttpServletRequest request) {
        return resposta(HttpStatus.CONFLICT, "Conflito de concorrencia", "concorrencia",
                "O registro foi alterado por outra transacao. Recarregue e tente novamente.", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> integridade(DataIntegrityViolationException excecao,
                                                       HttpServletRequest request) {
        return resposta(HttpStatus.CONFLICT, "Conflito de integridade", "integridade",
                "A operacao viola uma restricao de integridade do banco de dados.", request);
    }

    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<ProblemDetail> regraDeNegocio(RegraDeNegocioException excecao,
                                                         HttpServletRequest request) {
        return resposta(HttpStatus.UNPROCESSABLE_CONTENT, "Regra de negocio violada", "regra-de-negocio",
                excecao.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> acessoNegado(AccessDeniedException excecao,
                                                       HttpServletRequest request) {
        return resposta(HttpStatus.FORBIDDEN, "Acesso negado", "acesso-negado",
                "Voce' nao' tem permissao para executar esta operacao.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> erroInesperado(Exception excecao,
                                                         HttpServletRequest request) {
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno", "erro-interno",
                "Ocorreu um erro inesperado ao processar a requisicao.", request);
    }

    private static Map<String, String> descrever(FieldError erro) {
        return Map.of(
                "campo", erro.getField(),
                "mensagem", erro.getDefaultMessage() == null ? "Valor invalido." : erro.getDefaultMessage());
    }

    private static ResponseEntity<ProblemDetail> resposta(HttpStatus status, String titulo,
                                                          String tipo, String detalhe,
                                                          HttpServletRequest request) {
        return ResponseEntity.status(status).body(criar(status, titulo, tipo, detalhe, request));
    }

    private static ProblemDetail criar(HttpStatus status, String titulo, String tipo,
                                       String detalhe, HttpServletRequest request) {
        ProblemDetail problema = ProblemDetail.forStatus(status);
        problema.setTitle(titulo);
        problema.setType(URI.create(BASE_URI + tipo));
        problema.setDetail(detalhe);
        problema.setInstance(URI.create(request.getRequestURI()));
        problema.setProperty("timestamp", Instant.now());
        return problema;
    }
}
