import { User } from './user.entity';

const createdAt = new Date('2026-01-01');

const makeUser = () =>
  User.create({
    id: 1,
    name: 'Ana',
    email: 'ana@example.com',
    passwordHash: 'hash',
    createdAt,
  });

describe('User', () => {
  describe('create', () => {
    it('mapeia todos os campos', () => {
      const user = makeUser();

      expect(user.id).toBe(1);
      expect(user.name).toBe('Ana');
      expect(user.email).toBe('ana@example.com');
      expect(user.passwordHash).toBe('hash');
      expect(user.createdAt).toBe(createdAt);
    });
  });

  describe('nonRelationalData', () => {
    it('retorna os dados da entidade, incluindo passwordHash', () => {
      expect(makeUser().nonRelationalData).toEqual({
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
        createdAt,
      });
    });
  });
});
