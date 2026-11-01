import { CreateWorkDto } from '../dtos/create-work.dto';
import { WorksService } from '../services/works.service';
import { Work } from '../../domain/entities/work.entity';
import { CreateWorkUseCase } from './create-work.use-case';

const makeWork = () =>
  Work.create({ id: 1, name: 'Obra A', createdAt: new Date('2026-01-01') });

describe('CreateWorkUseCase', () => {
  let service: { create: jest.Mock };
  let useCase: CreateWorkUseCase;
  const input = { name: 'Obra A' } as CreateWorkDto;

  beforeEach(() => {
    service = { create: jest.fn() };
    useCase = new CreateWorkUseCase(service as unknown as WorksService);
  });

  it('cria a obra e retorna apenas id e name', async () => {
    service.create.mockResolvedValue(makeWork());

    await expect(useCase.execute(input)).resolves.toEqual({
      id: 1,
      name: 'Obra A',
    });
    expect(service.create).toHaveBeenCalledWith({ name: 'Obra A' });
  });

  it('repassa ao service apenas name', async () => {
    service.create.mockResolvedValue(makeWork());

    await useCase.execute({
      name: 'Obra A',
      extra: 'ignorado',
    } as unknown as CreateWorkDto);

    expect(service.create).toHaveBeenCalledWith({ name: 'Obra A' });
  });

  it('retorna null quando o service retorna null', async () => {
    service.create.mockResolvedValue(null);

    await expect(useCase.execute(input)).resolves.toBeNull();
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.create.mockRejectedValue(error);

    await expect(useCase.execute(input)).rejects.toBe(error);
  });
});
