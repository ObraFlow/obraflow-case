import { Inject, Injectable } from '@nestjs/common';
import {
  WORKS_REPOSITORY,
  WorksRepository,
  CreateWorkData,
} from '../../domain/repositories/works.repository';
import { Work } from '../../domain/entities/work.entity';

@Injectable()
export class WorksService {
  constructor(
    @Inject(WORKS_REPOSITORY) private readonly repository: WorksRepository,
  ) {}

  list(): Promise<Work[]> {
    return this.repository.list();
  }

  create(data: CreateWorkData): Promise<Work | null> {
    return this.repository.create(data);
  }
}
