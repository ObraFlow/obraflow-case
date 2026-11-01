export type NonRelationalWork = {
  id: number;
  name: string;
  createdAt: Date;
};

export class Work {
  private constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  static create(data: { id: number; name: string; createdAt: Date }): Work {
    return new Work(data.id, data.name, data.createdAt);
  }

  get nonRelationalData(): NonRelationalWork {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
    };
  }
}
