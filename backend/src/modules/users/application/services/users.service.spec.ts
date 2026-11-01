import {
  CreateUserData,
  UsersRepository,
} from '../../domain/repositories/users.repository';
import { User } from '../../domain/entities/user.entity';
import { UsersService } from './users.service';

const makeUser = () =>
  User.create({
    id: 1,
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'hash',
    createdAt: new Date('2026-01-01'),
  });

describe('UsersService', () => {
  let repository: { list: jest.Mock; create: jest.Mock };
  let service: UsersService;
  const data = { name: 'Ana', email: 'ana@example.com' } as CreateUserData;

  beforeEach(() => {
    repository = { list: jest.fn(), create: jest.fn() };
    service = new UsersService(repository as unknown as UsersRepository);
  });

  describe('list', () => {
    it('delega para repository.list', async () => {
      const users = [makeUser()];
      repository.list.mockResolvedValue(users);

      await expect(service.list()).resolves.toBe(users);
      expect(repository.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('delega para repository.create e retorna o usuário', async () => {
      const user = makeUser();
      repository.create.mockResolvedValue(user);

      await expect(service.create(data)).resolves.toBe(user);
      expect(repository.create).toHaveBeenCalledWith(data);
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.create.mockResolvedValue(null);

      await expect(service.create(data)).resolves.toBeNull();
    });
  });
});
