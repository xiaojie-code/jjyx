import {
  Repository,
  FindOptionsWhere,
  DeepPartial,
  FindManyOptions,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaginatedResult, PaginationDto } from '../dto/pagination.dto';

export class BaseService<T extends { id: number }> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(
    pagination: PaginationDto,
    where?: FindOptionsWhere<T>,
    options?: Omit<FindManyOptions<T>, 'skip' | 'take' | 'where'>,
  ): Promise<PaginatedResult<T>> {
    const { page, pageSize } = pagination;
    const [list, total] = await this.repository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...options,
    });
    return { list, total, page, pageSize };
  }

  async findById(id: number): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`Record with id ${id} not found`);
    }
    return entity;
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.remove(entity);
  }
}
