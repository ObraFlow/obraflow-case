export type NonRelationalSupplier = {
  id: number;
  name: string;
  document: string;
  createdAt: Date;
};

export class Supplier {
  private constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly document: string,
    public readonly createdAt: Date,
  ) {}

  static create(data: {
    id: number;
    name: string;
    document: string;
    createdAt: Date;
  }): Supplier {
    return new Supplier(data.id, data.name, data.document, data.createdAt);
  }

  get nonRelationalData(): NonRelationalSupplier {
    return {
      id: this.id,
      name: this.name,
      document: this.document,
      createdAt: this.createdAt,
    };
  }
}
