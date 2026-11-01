import { CreateUserDto } from '../dtos/create-user.dto';
import { UsersService } from '../services/users.service';
import { User } from '../../domain/entities/user.entity';
import { CreateUserUseCase } from './create-user.use-case';

const createdAt = new Date('2026-01-01');

const makeUser = () =>
  User.create({
    id: 1,
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'hash',
    createdAt,
  });

describe('CreateUserUseCase', () => {
  let service: { create: jest.Mock };
  let useCase: CreateUserUseCase;
  const input = { name: 'Ana', email: 'ana@example.com' } as CreateUserDto;

  beforeEach(() => {
    service = { create: jest.fn() };
    useCase = new CreateUserUseCase(service as unknown as UsersService);
  });

  it('cria o usuário e retorna o DTO sem passwordHash', async () => {
    service.create.mockResolvedValue(makeUser());

    await expect(useCase.execute(input)).resolves.toEqual({
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      createdAt,
    });
    expect(service.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
    });
  });

  it('repassa ao service apenas name e email', async () => {
    service.create.mockResolvedValue(makeUser());

    await useCase.execute({
      name: 'Ana',
      email: 'ana@example.com',
      extra: 'ignorado',
    } as unknown as CreateUserDto);

    expect(service.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
    });
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
