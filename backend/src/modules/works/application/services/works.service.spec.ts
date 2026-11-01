import {
  CreateWorkData,
  WorksRepository,
} from '../../domain/repositories/works.repository';
import { Work } from '../../domain/entities/work.entity';
import { WorksService } from './works.service';

const makeWork = () =>
  Work.create({ id: 1, name: 'Obra A', createdAt: new Date('2026-01-01') });

describe('WorksService', () => {
  let repository: { list: jest.Mock; create: jest.Mock };
  let service: WorksService;
  const data = { name: 'Obra A' } as CreateWorkData;

  beforeEach(() => {
    repository = { list: jest.fn(), create: jest.fn() };
    service = new WorksService(repository as unknown as WorksRepository);
  });

  describe('list', () => {
    it('delega para repository.list', async () => {
      const works = [makeWork()];
      repository.list.mockResolvedValue(works);

      await expect(service.list()).resolves.toBe(works);
      expect(repository.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('delega para repository.create e retorna a obra', async () => {
      const work = makeWork();
      repository.create.mockResolvedValue(work);

      await expect(service.create(data)).resolves.toBe(work);
      expect(repository.create).toHaveBeenCalledWith(data);
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.create.mockResolvedValue(null);

      await expect(service.create(data)).resolves.toBeNull();
    });
  });
});
