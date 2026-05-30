import { NotFoundException } from '@nestjs/common';
import { BaseService } from './base.service';

// Minimal entity type for testing
interface TestEntity {
  id: number;
  name: string;
}

function createMockRepository() {
  return {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((entity) => Promise.resolve(entity)),
    remove: jest.fn((entity) => Promise.resolve(entity)),
  };
}

describe('BaseService', () => {
  let service: BaseService<TestEntity>;
  let repo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    repo = createMockRepository();
    service = new BaseService(repo as any);
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const items = [{ id: 1, name: 'a' }];
      repo.findAndCount.mockResolvedValue([items, 1]);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result).toEqual({ list: items, total: 1, page: 1, pageSize: 10 });
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should calculate correct skip for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 2, pageSize: 5 });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = { id: 1, name: 'test' };
      repo.findOne.mockResolvedValue(entity);

      expect(await service.findById(1)).toEqual(entity);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save entity', async () => {
      const data = { name: 'new' } as any;
      repo.create.mockReturnValue(data);
      repo.save.mockResolvedValue({ id: 1, ...data });

      const result = await service.create(data);
      expect(result).toEqual({ id: 1, name: 'new' });
    });
  });

  describe('update', () => {
    it('should update existing entity', async () => {
      const existing = { id: 1, name: 'old' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ id: 1, name: 'updated' });

      const result = await service.update(1, { name: 'updated' } as any);
      expect(result.name).toBe('updated');
    });

    it('should throw if entity not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(999, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should remove existing entity', async () => {
      const entity = { id: 1, name: 'test' };
      repo.findOne.mockResolvedValue(entity);

      await service.delete(1);
      expect(repo.remove).toHaveBeenCalledWith(entity);
    });

    it('should throw if entity not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
