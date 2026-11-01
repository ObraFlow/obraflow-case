import { Work } from './work.entity';

const createdAt = new Date('2026-01-01');

const makeWork = () => Work.create({ id: 1, name: 'Obra A', createdAt });

describe('Work', () => {
  describe('create', () => {
    it('mapeia todos os campos', () => {
      const work = makeWork();

      expect(work.id).toBe(1);
      expect(work.name).toBe('Obra A');
      expect(work.createdAt).toBe(createdAt);
    });
  });

  describe('nonRelationalData', () => {
    it('retorna os dados da entidade', () => {
      expect(makeWork().nonRelationalData).toEqual({
        id: 1,
        name: 'Obra A',
        createdAt,
      });
    });
  });
});
