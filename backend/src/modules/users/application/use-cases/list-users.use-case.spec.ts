import { UsersService } from '../services/users.service';
import { User } from '../../domain/entities/user.entity';
import { ListUsersUseCase } from './list-users.use-case';

const makeUser = (id: number, name: string, email: string) =>
  User.create({
    id,
    name,
    email,
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01'),
  });

describe('ListUsersUseCase', () => {
  let service: { list: jest.Mock };
  let useCase: ListUsersUseCase;

  beforeEach(() => {
    service = { list: jest.fn() };
    useCase = new ListUsersUseCase(service as unknown as UsersService);
  });

  it('retorna lista vazia quando não há usuários', async () => {
    service.list.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('mapeia todos os usuários para o DTO sem passwordHash', async () => {
    service.list.mockResolvedValue([
      makeUser(1, 'Ana', 'ana@example.com'),
      makeUser(2, 'Beto', 'beto@example.com'),
    ]);

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        name: 'Beto',
        email: 'beto@example.com',
        createdAt: new Date('2026-01-01'),
      },
    ]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.list.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
