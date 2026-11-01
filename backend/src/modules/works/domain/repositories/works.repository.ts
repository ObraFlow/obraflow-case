import { Work } from '../entities/work.entity';

export const WORKS_REPOSITORY = Symbol('WORKS_REPOSITORY');

export type CreateWorkData = {
  name: string;
};

export interface WorksRepository {
  list(): Promise<Work[]>;
  create(name: CreateWorkData): Promise<Work | null>;
  toDomainEntity(data: unknown): Work;
}
