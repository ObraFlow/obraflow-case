/** Erro de regra de negócio, já com o status HTTP que deve ser devolvido. */
export class DomainError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
