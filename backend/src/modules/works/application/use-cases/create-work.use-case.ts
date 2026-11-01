import { Injectable } from '@nestjs/common';
import {
  CreateWorkDto,
  CreateWorkResponseDataDto,
} from '../dtos/create-work.dto';
import { WorksService } from '../services/works.service';

@Injectable()
export class CreateWorkUseCase {
  constructor(private readonly service: WorksService) {}

  async execute(
    input: CreateWorkDto,
  ): Promise<CreateWorkResponseDataDto | null> {
    const createdWork = await this.service.create({
      name: input.name,
    });

    if (!createdWork) {
      return null;
    }

    return {
      id: createdWork.id,
      name: createdWork.name,
    };
  }
}
