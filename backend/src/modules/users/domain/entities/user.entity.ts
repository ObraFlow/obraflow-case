export type NonRelationalUser = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export class User {
  private constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
  ) {}

  static create(data: {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
  }): User {
    return new User(
      data.id,
      data.name,
      data.email,
      data.passwordHash,
      data.createdAt,
    );
  }

  get nonRelationalData(): NonRelationalUser {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
    };
  }
}
