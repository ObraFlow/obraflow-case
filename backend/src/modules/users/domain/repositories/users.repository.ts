import { User } from '../entities/user.entity';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export type CreateUserData = {
  name: string;
  email: string;
};

export interface UsersRepository {
  list(): Promise<User[]>;
  create(data: CreateUserData): Promise<User | null>;
  toDomainEntity(data: unknown): User;
}
