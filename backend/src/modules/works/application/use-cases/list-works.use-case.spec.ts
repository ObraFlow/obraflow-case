import { WorksService } from '../services/works.service';
import { Work } from '../../domain/entities/work.entity';
import { ListWorksUseCase } from './list-works.use-case';

const makeWork = (id: number, name: string) =>
  Work.create({ id, name, createdAt: new Date('2026-01-01') });

describe('ListWorksUseCase', () => {
  let service: { list: jest.Mock };
  let useCase: ListWorksUseCase;

  beforeEach(() => {
    service = { list: jest.fn() };
    useCase = new ListWorksUseCase(service as unknown as WorksService);
  });

  it('retorna lista vazia quando não há obras', async () => {
    service.list.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('mapeia todas as obras para id e name', async () => {
    service.list.mockResolvedValue([
      makeWork(1, 'Obra A'),
      makeWork(2, 'Obra B'),
    ]);

    await expect(useCase.execute()).resolves.toEqual([
      { id: 1, name: 'Obra A' },
      { id: 2, name: 'Obra B' },
    ]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.list.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
