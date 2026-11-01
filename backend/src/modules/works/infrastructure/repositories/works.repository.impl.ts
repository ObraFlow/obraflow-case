import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DATABASE } from '../../../../database/database.module';
import { Database } from '../../../../database/database.types';
import { works } from '../../../../database/schema';
import {
  WorksRepository,
  CreateWorkData,
} from '../../domain/repositories/works.repository';
import { Work } from '../../domain/entities/work.entity';

@Injectable()
export class WorksRepositoryImpl implements WorksRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<Work[]> {
    const worksData = this.db.select().from(works).orderBy(asc(works.id));
    return worksData.then((data) =>
      data.map((work) => this.toDomainEntity(work)),
    );
  }

  async create(data: CreateWorkData): Promise<Work | null> {
    const newWork = await this.db
      .insert(works)
      .values({
        name: data.name,
      })
      .returning();

    if (newWork.length === 0) {
      return null;
    }

    return this.toDomainEntity(newWork[0]);
  }

  toDomainEntity(data: unknown): Work {
    const workData = data as {
      id: number;
      name: string;
      createdAt: Date;
    };

    return Work.create({
      id: workData.id,
      name: workData.name,
      createdAt: workData.createdAt,
    });
  }
}
