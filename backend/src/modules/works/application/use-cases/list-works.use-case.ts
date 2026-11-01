import { Injectable } from '@nestjs/common';
import { WorksService } from '../services/works.service';
import { ListWorksResponseDataDto } from '../dtos/list-works.dto';

@Injectable()
export class ListWorksUseCase {
  constructor(private readonly service: WorksService) {}

  async execute(): Promise<ListWorksResponseDataDto[]> {
    const works = await this.service.list();

    return works.map((work) => ({
      id: work.id,
      name: work.name,
    }));
  }
}
