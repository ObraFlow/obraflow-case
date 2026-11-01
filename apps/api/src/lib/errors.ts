// Single source of truth for API error codes and their Portuguese messages.
// Services throw `errors.*()`; they never spell a code or message inline. The codes themselves
// live in @dokimos/shared so the web branches on the same definitions.
import { ErrorCode, IssueCode } from "@dokimos/shared";

export { ErrorCode, IssueCode };

export interface FieldIssue {
  field: string;
  code: IssueCode;
  message: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const notFoundMessages = {
  project: "Obra não encontrada.",
  order: "Pedido não encontrado.",
  user: "Usuário não encontrado.",
  supplier: "Fornecedor não encontrado.",
  resource: "Recurso não encontrado.",
} as const;

export function validation(details: FieldIssue[], message = "Verifique os campos informados."): HttpError {
  return new HttpError(400, ErrorCode.VALIDATION_ERROR, message, details);
}

export const errors = {
  // 400
  invalidRequest: () => new HttpError(400, ErrorCode.INVALID_REQUEST, "Requisição inválida."),
  invalidUuid: (field: string) =>
    validation(
      [{ field, code: IssueCode.INVALID_UUID, message: "Informe um identificador válido." }],
      "Identificador inválido.",
    ),
  invalidApprovers: (details: FieldIssue[]) => validation(details, "Verifique os aprovadores informados."),
  invalidSupplier: () =>
    validation(
      [{ field: "supplierId", code: IssueCode.INVALID_SUPPLIER, message: "Fornecedor não encontrado." }],
      "Selecione um fornecedor válido.",
    ),
  amountOverflow: (field: string) =>
    validation(
      [{ field, code: IssueCode.AMOUNT_OVERFLOW, message: "O valor deve ser no máximo 9999999999999999.99." }],
      "O valor calculado excede o limite permitido.",
    ),
  invalidData: () => validation([]),
  invalidMember: () => new HttpError(400, ErrorCode.INVALID_MEMBER, "Selecione um usuário ativo."),

  // 401
  loginRequired: () => new HttpError(401, ErrorCode.UNAUTHENTICATED, "Faça login para continuar."),
  invalidSession: () => new HttpError(401, ErrorCode.UNAUTHENTICATED, "Sessão inválida."),
  inactiveSession: () => new HttpError(401, ErrorCode.UNAUTHENTICATED, "Sessão inválida ou usuário inativo."),
  invalidCredentials: () => new HttpError(401, ErrorCode.INVALID_CREDENTIALS, "Usuário ou senha inválidos."),

  // 403
  forbidden: () => new HttpError(403, ErrorCode.FORBIDDEN, "Você não tem permissão para esta operação."),
  adminCannotBeDisabled: () =>
    new HttpError(403, ErrorCode.ADMIN_CANNOT_BE_DISABLED, "O administrador inicial não pode ser desativado."),

  // 404
  notFound: (resource: keyof typeof notFoundMessages) =>
    new HttpError(404, ErrorCode.NOT_FOUND, notFoundMessages[resource]),

  // 409
  coaVersionConflict: () =>
    new HttpError(
      409,
      ErrorCode.COA_VERSION_CONFLICT,
      "A alçada mudou. Recarregue a versão atual e reconcilie suas alterações.",
    ),
  approvalStepConflict: () =>
    new HttpError(409, ErrorCode.APPROVAL_STEP_CONFLICT, "A etapa atual mudou. Recarregue o pedido."),
  orderAlreadyDecided: () => new HttpError(409, ErrorCode.ORDER_ALREADY_DECIDED, "Este pedido já foi concluído."),
  coaNotConfigured: () =>
    new HttpError(409, ErrorCode.PROJECT_COA_NOT_CONFIGURED, "Configure uma alçada válida para esta obra."),
  coaNotConfiguredForOrders: () =>
    new HttpError(
      409,
      ErrorCode.PROJECT_COA_NOT_CONFIGURED,
      "Configure a alçada desta obra antes de cadastrar pedidos.",
    ),
  coaApproverUnavailable: () =>
    new HttpError(409, ErrorCode.PROJECT_COA_NOT_CONFIGURED, "A alçada desta obra possui aprovadores indisponíveis."),
  projectArchived: () =>
    new HttpError(
      409,
      ErrorCode.PROJECT_ARCHIVED,
      "Esta obra está arquivada. Reative a obra antes de criar pedidos ou alterar sua configuração.",
    ),
  projectHasPendingOrders: () =>
    new HttpError(
      409,
      ErrorCode.PROJECT_HAS_PENDING_ORDERS,
      "Esta obra possui pedidos pendentes. Conclua as aprovações ou rejeições desses pedidos antes de arquivar a obra.",
    ),
  supplierInactiveRename: () =>
    new HttpError(409, ErrorCode.SUPPLIER_INACTIVE, "Este fornecedor está inativo e não pode ser renomeado."),
  supplierInactive: () =>
    new HttpError(409, ErrorCode.SUPPLIER_INACTIVE, "Este fornecedor está inativo. Selecione outro fornecedor."),
  usernameExists: () => new HttpError(409, ErrorCode.USERNAME_ALREADY_EXISTS, "Este nome de usuário já existe."),
  userAssignedToActiveCoa: () =>
    new HttpError(409, ErrorCode.USER_ASSIGNED_TO_ACTIVE_COA, "Remova o usuário da alçada ativa antes de desativá-lo."),
  userHasPendingApprovals: () =>
    new HttpError(409, ErrorCode.USER_HAS_PENDING_APPROVALS, "O usuário possui aprovações pendentes."),
  membershipExists: () => new HttpError(409, ErrorCode.MEMBERSHIP_ALREADY_EXISTS, "Usuário já faz parte desta obra."),
  memberAssignedToActiveCoa: () =>
    new HttpError(
      409,
      ErrorCode.MEMBER_ASSIGNED_TO_ACTIVE_COA,
      "Este membro está na alçada publicada. Atualize e salve a alçada antes de removê-lo.",
    ),
  memberHasPendingApprovals: () =>
    new HttpError(
      409,
      ErrorCode.MEMBER_HAS_PENDING_APPROVALS,
      "Este membro ainda possui aprovações pendentes nesta obra. Conclua esses pedidos antes de removê-lo.",
    ),

  // Framework-level and unexpected failures
  payloadTooLarge: () =>
    new HttpError(413, ErrorCode.PAYLOAD_TOO_LARGE, "O corpo da requisição excede o limite permitido."),
  unsupportedMediaType: () =>
    new HttpError(415, ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Tipo de conteúdo não suportado. Envie JSON."),
  internal: () => new HttpError(500, ErrorCode.INTERNAL_ERROR, "Erro interno. Tente novamente."),
};
