import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Matrix } from '../entities/matrix.entity';
import { MatrixSlot } from '../entities/matrix-slot.entity';
import { MatrixIncome } from '../entities/matrix-income.entity';
import { User } from '../entities/user.entity';
import { CurrencyService } from '../currency/currency.service';

/** 启动金额（可后续改为配置项） */
const DEFAULT_START_FUND = 2000;
/** 每个坑位的收益比例*/
const SLOT_INCOME_RATE = 0.35;

@Injectable()
export class MatrixService {
  private readonly logger = new Logger(MatrixService.name);

  constructor(
    @InjectRepository(Matrix)
    private readonly matrixRepo: Repository<Matrix>,
    @InjectRepository(MatrixSlot)
    private readonly slotRepo: Repository<MatrixSlot>,
    @InjectRepository(MatrixIncome)
    private readonly incomeRepo: Repository<MatrixIncome>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => CurrencyService))
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * 为用户创建第一轮矩阵（注册时或激活时调用户
   */
  async createFirstMatrix(userId: number): Promise<Matrix> {
    const existing = await this.matrixRepo.findOne({
      where: { ownerId: userId, status: 1 },
    });
    if (existing) return existing;

    const matrix = this.matrixRepo.create({
      ownerId: userId,
      round: 1,
      status: 1,
      filledCount: 0,
      startFund: 0,
    });
    return this.matrixRepo.save(matrix);
  }

  private async completeFullActiveMatrixIfNeeded(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const matrix = await manager.findOne(Matrix, {
        where: { ownerId: userId, status: 1 },
        order: { round: 'ASC' },
      });

      if (matrix && Number(matrix.filledCount) >= 6) {
        await this.handleMatrixComplete(matrix, manager);
      }
    });
  }

  /**
   * 获取推广邀请码信息和推广统计
   */
  async getInviteInfo(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'inviteCode', 'nickname', 'invitedBy'] });
    if (!user) return null;
    await this.completeFullActiveMatrixIfNeeded(userId);

    // 获取直接上级信息
    let inviter: { id: number; account: string; nickname: string } | null = null;
    if (user.invitedBy) {
      const inviterUser = await this.userRepo.findOne({
        where: { id: user.invitedBy },
        select: ['id', 'account', 'nickname'],
      });
      if (inviterUser) {
        inviter = { id: inviterUser.id, account: inviterUser.account, nickname: inviterUser.nickname };
      }
    }

    // 直推人数
    const directCount = await this.userRepo.count({ where: { invitedBy: userId } });

    // 矩阵统计
    const currentMatrix = await this.matrixRepo.findOne({ where: { ownerId: userId, status: 1 } });
    const completedCount = await this.matrixRepo.count({ where: { ownerId: userId, status: 2 } });

    // 总收益（只统计已完成矩阵的收益）
    const completedMatrixIds = await this.matrixRepo.find({
      where: { ownerId: userId, status: 2 },
      select: ['id'],
    });
    let totalEarnedValue = 0;
    if (completedMatrixIds.length > 0) {
      const ids = completedMatrixIds.map(m => m.id);
      const totalEarned = await this.incomeRepo
        .createQueryBuilder('i')
        .select('SUM(i.amount)', 'total')
        .where('i.owner_id = :userId', { userId })
        .andWhere('i.income_type = :type', { type: 'claimable' })
        .andWhere('i.matrix_id IN (:...ids)', { ids })
        .getRawOne();
      totalEarnedValue = Number(totalEarned?.total || 0);
    }

    return {
      inviteCode: user.inviteCode,
      nickname: user.nickname,
      inviter,
      directCount,
      currentRound: currentMatrix?.round || 1,
      currentFilled: currentMatrix?.filledCount || 0,
      completedMatrices: completedCount,
      totalEarned: totalEarnedValue,
    };
  }

  /**
   * 核心方法：新用户注册后触发入位逻辑
   * 1. 进入直接上级的矩阵
   * 2. 沿跟随链向上补位到更上级的矩阵
   */
  async onUserRegistered(newUserId: number, inviterId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 为新用户创建自己的矩阵
      const newUserMatrix = manager.create(Matrix, {
        ownerId: newUserId,
        round: 1,
        status: 1,
        filledCount: 0,
        startFund: 0,
      });
      await manager.save(Matrix, newUserMatrix);

      // 沿跟随链向上补位
      await this.fillUpwardMatrices(newUserId, inviterId, true, manager);
    });
  }

  /**
   * 沿跟随链向上填充矩阵坑位
   * @param userId 要入位的用户
   * @param targetOwnerId 目标矩阵的顶点用户
   * @param isNewUser 是否为新用户首次入位
   * @param manager 事务管理器
   */
  private async fillUpwardMatrices(
    userId: number,
    targetOwnerId: number,
    isNewUser: boolean,
    manager: any,
  ): Promise<void> {
    // 找到目标用户当前进行中的矩阵
    let currentMatrix = await manager.findOne(Matrix, {
      where: { ownerId: targetOwnerId, status: 1 },
    });

    if (!currentMatrix) {
      // 如果目标用户没有进行中的矩阵，创建一
      currentMatrix = manager.create(Matrix, {
        ownerId: targetOwnerId,
        round: 1,
        status: 1,
        filledCount: 0,
        startFund: 0,
      });
      currentMatrix = await manager.save(Matrix, currentMatrix);
    }

    // 检查该用户是否已经在这个矩阵中
    const existingSlot = await manager.findOne(MatrixSlot, {
      where: { matrixId: currentMatrix.id, userId },
    });
    if (existingSlot) return; // 已经在矩阵中，不重复入位

    // 矩阵已满，不能入位
    if (currentMatrix.filledCount >= 6) return;

    // 计算坑位编号：按树形结构分配
    // 矩阵结构：顶点A 1,2（第一层）3,4(1的子),5,6(2的子)（第二层
    const nextSlotNumber = await this.calculateTreeSlot(
      userId, targetOwnerId, currentMatrix.id, manager,
    );
    if (nextSlotNumber === 0) return; // 没有合适的空位

    // 计算收益（按用户轮次
    const { incomeAmount, incomeType, remainingFund, reentryCount } =
      await this.calculateSlotIncomeByRound(nextSlotNumber, isNewUser, userId, manager);

    const actualIncomeAmount = incomeAmount;
    const actualRemainingFund = remainingFund;
    const actualReentryCount = reentryCount;

    // 创建坑位记录
    // 判断是否为矩阵顶点的直推用户
    const entryUser = await manager.findOne(User, { where: { id: userId } });
    const isDirect = Number(entryUser?.invitedBy) === Number(targetOwnerId);

    const slot = manager.create(MatrixSlot, {
      matrixId: currentMatrix.id,
      slotNumber: nextSlotNumber,
      userId,
      isNewUser,
      isDirect,
      incomeAmount: actualIncomeAmount,
      incomeType,
      remainingFund: actualRemainingFund,
      reentryCount: actualReentryCount,
    });
    await manager.save(MatrixSlot, slot);

    // 更新矩阵填充数
    currentMatrix.filledCount += 1;

    // 记录收益
    if (actualIncomeAmount > 0) {
      const income = manager.create(MatrixIncome, {
        ownerId: targetOwnerId,
        matrixId: currentMatrix.id,
        slotNumber: nextSlotNumber,
        fromUserId: userId,
        amount: actualIncomeAmount,
        incomeType,
        description: isNewUser
          ? `新用户入位第${nextSlotNumber}号坑位`
          : `老用户再次入位第${nextSlotNumber}号坑位（{actualReentryCount}次）`,
      });
      await manager.save(MatrixIncome, income);

      // 更新矩阵收益汇总
      if (incomeType === 'claimable') {
        currentMatrix.claimableIncome = Number(currentMatrix.claimableIncome) + actualIncomeAmount;
      } else if (incomeType === 'next_fund') {
        currentMatrix.nextRoundFund = Number(currentMatrix.nextRoundFund) + actualIncomeAmount;
      }
    }

    await manager.save(Matrix, currentMatrix);

    // 如果进入了第二层-6号位），同时也要进入对应一层用户的矩阵
    if (nextSlotNumber >= 3) {
      await this.cascadeIntoFirstLayerUserMatrix(
        userId, nextSlotNumber, currentMatrix.id, isNewUser, manager,
      );
    }

    // 矩阵满员后自动出局进入下一轮
    if (currentMatrix.filledCount >= 6) {
      await this.handleMatrixComplete(currentMatrix, manager);
    }

    // 继续向上补位：查找目标用户的上级（沿邀请链）
    // 规则：只有当目标用户在上级矩阵的第一层（1、2号位）时，其直推才能向上补位到上级矩阵的第二层
    if (isNewUser) {
      const targetUser = await manager.findOne(User, { where: { id: targetOwnerId } });
      if (targetUser && targetUser.invitedBy) {
        const superiorMatrix = await manager.findOne(Matrix, {
          where: { ownerId: targetUser.invitedBy, status: 1 },
        });
        if (superiorMatrix) {
          const targetInSuperior = await manager.findOne(MatrixSlot, {
            where: { matrixId: superiorMatrix.id, userId: targetOwnerId },
          });
          if (targetInSuperior && targetInSuperior.slotNumber <= 2) {
            await this.fillUpwardMatrices(userId, targetUser.invitedBy, isNewUser, manager);
          }
        }
      }

      // 额外检查：目标用户是否在别人的矩阵一层（级联入位的情况）
      // 如果目标用户在某个矩阵的1号或2号位，新用户也要补位到那个矩阵
      const targetSlots = await manager.find(MatrixSlot, {
        where: { userId: targetOwnerId },
      });
      for (const ts of targetSlots) {
        if (ts.slotNumber <= 2) {
          // 目标用户在某矩阵的一层，检查是不是已经处理过的上级矩阵
          const thatMatrix = await manager.findOne(Matrix, { where: { id: ts.matrixId, status: 1 } });
          if (thatMatrix && Number(thatMatrix.ownerId) !== Number(targetOwnerId)) {
            // 排除已经处理过的邀请链上级矩阵
            const targetUser2 = await manager.findOne(User, { where: { id: targetOwnerId } });
            if (Number(thatMatrix.ownerId) !== Number(targetUser2?.invitedBy)) {
              // 这是级联矩阵，新用户也要补位进去
              if (thatMatrix.filledCount < 6) {
                const existingInThat = await manager.findOne(MatrixSlot, {
                  where: { matrixId: thatMatrix.id, userId },
                });
                if (!existingInThat) {
                  await this.fillUpwardMatrices(userId, thatMatrix.ownerId, isNewUser, manager);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * 按树形结构计算坑位编号
   * 规则
   * - 在自己的矩阵中（直接上级是矩阵顶点）：直推优先占1，满了继续占3-6（按顺序
   * - 向上补位到上级矩阵时
   *   - 直接上级1 号位 只能3 号位，满了不能进入
   *   - 直接上级2 号位 只能5 号位，满了不能进入
   *   - 直接上级在第二层或不在矩阵中 不能进入
   */
  private async calculateTreeSlot(
    userId: number,
    matrixOwnerId: number,
    matrixId: number,
    manager: any,
  ): Promise<number> {
    // 获取已占用的坑位
    const occupiedSlots = await manager.find(MatrixSlot, {
      where: { matrixId },
    });
    const occupied = new Set(occupiedSlots.map((s: any) => s.slotNumber));

    // 查找入位用户的直接上级
    const user = await manager.findOne(User, { where: { id: userId } });
    const inviterId = user?.invitedBy;

    if (Number(inviterId) === Number(matrixOwnerId)) {
      // 直接上级是矩阵顶点优先1，满了按顺序继续
      const preferred = [1, 2, 3, 4, 5, 6];
      for (const slot of preferred) {
        if (!occupied.has(slot)) return slot;
      }
      return 0;
    } else if (inviterId) {
      // 查找直接上级在这个矩阵中的坑位
      const inviterSlot = occupiedSlots.find((s: any) => Number(s.userId) === Number(inviterId));
      if (inviterSlot) {
        const parentSlotNumber = inviterSlot.slotNumber;
        let allowedSlots: number[] = [];
        if (parentSlotNumber === 1) {
          allowedSlots = [3, 4];
        } else if (parentSlotNumber === 2) {
          allowedSlots = [5, 6];
        } else {
          // 上级在第二层，不能再往下排
          return 0;
        }
        // 严格限制：只能进允许的位置，满了就不能进
        for (const slot of allowedSlots) {
          if (!occupied.has(slot)) return slot;
        }
        return 0; // 位置满了，不能进入这个矩阵
      } else {
        // 上级不在这个矩阵中，不能进入
        return 0;
      }
    }

    // 没有上级的情况（不应该发生）
    return 0;
  }

  /**
   * 计算坑位收益
   * 规则
   * - 新用户（轮）：资金= 2000，收益= 2000 × 35%
   * - 老用户（第N轮）：资金= 该用户当前矩阵的 startFund（来自上一号位收益之和），收益 = startFund × 35%
   * - 1-4号位：收益计入可领取
   * - 5-6号位：收益计入下轮启动资金
   */
  private async calculateSlotIncomeByRound(
    slotNumber: number,
    isNewUser: boolean,
    userId: number,
    manager: any,
  ): Promise<{ incomeAmount: number; incomeType: string; remainingFund: number; reentryCount: number }> {
    let baseFund = DEFAULT_START_FUND;
    let userRound = 1;

    if (!isNewUser) {
      // 查询该用户当前进行中的矩阵的 startFund
      const currentMatrix = await manager.findOne(Matrix, {
        where: { ownerId: userId, status: 1 },
      });
      if (currentMatrix && currentMatrix.startFund > 0) {
        baseFund = Number(currentMatrix.startFund);
      } else {
        // 如果没有进行中的矩阵startFund 0，查找最近完成的矩阵
        const lastCompleted = await manager.findOne(Matrix, {
          where: { ownerId: userId, status: 2 },
          order: { round: 'DESC' },
        });
        if (lastCompleted && lastCompleted.startFund > 0) {
          baseFund = Number(lastCompleted.startFund);
        }
      }

      const completedCount = await manager.count(Matrix, {
        where: { ownerId: userId, status: 2 },
      });
      userRound = completedCount + 1;
    }

    // 收益 = 资金基数 * 35%（保留完整精度）
    const incomeAmount = baseFund * SLOT_INCOME_RATE;
    const remainingFund = baseFund - incomeAmount;

    // 收益小于 0.1 则不计入
    const finalIncome = incomeAmount >= 0.1 ? incomeAmount : 0;

    if (slotNumber <= 4) {
      return {
        incomeAmount: finalIncome,
        incomeType: finalIncome > 0 ? 'claimable' : 'none',
        remainingFund,
        reentryCount: userRound - 1,
      };
    } else {
      return {
        incomeAmount: finalIncome,
        incomeType: finalIncome > 0 ? 'next_fund' : 'none',
        remainingFund,
        reentryCount: userRound - 1,
      };
    }
  }

  /**
   * 矩阵满员处理：出局 + 开启下一+ 跟随上级入位
   */
  private async handleMatrixComplete(matrix: Matrix, manager: any): Promise<void> {
    // 标记当前矩阵完成
    matrix.status = 2;
    matrix.completedAt = new Date();
    await manager.save(Matrix, matrix);

    this.logger.log(`矩阵 #${matrix.id} 完成，用户 ${matrix.ownerId} 出局（第${matrix.round}轮）`);

    // 开启下一轮矩阵
    const nextMatrix = manager.create(Matrix, {
      ownerId: matrix.ownerId,
      round: matrix.round + 1,
      status: 1,
      filledCount: 0,
      startFund: Number(matrix.nextRoundFund),
      claimableIncome: 0,
      nextRoundFund: 0,
    });
    await manager.save(Matrix, nextMatrix);

    this.logger.log(`用户 ${matrix.ownerId} 开启第${nextMatrix.round}轮矩阵，启动资金: ${nextMatrix.startFund}`);

    // 出局后跟随上级入位：查找该用户的直接上级
    const user = await manager.findOne(User, { where: { id: matrix.ownerId } });
    if (user && user.invitedBy) {
      // 查找上级当前进行中的矩阵
      const superiorMatrix = await manager.findOne(Matrix, {
        where: { ownerId: user.invitedBy, status: 1 },
      });
      if (superiorMatrix && superiorMatrix.filledCount < 6) {
        // 出局后再次入位上级矩阵（每次出局都要占新坑位置
        // 规则：优先进入号位，然号位（从上到下，左到右，跳过已占的位置）
        const nextSlot = await this.calculateReentrySlot(
          matrix.ownerId, superiorMatrix.id, manager,
        );
        if (nextSlot > 0) {
          // 计算收益
          const { incomeAmount, incomeType, remainingFund, reentryCount } =
            await this.calculateSlotIncomeByRound(nextSlot, false, matrix.ownerId, manager);

          const entryUser = await manager.findOne(User, { where: { id: matrix.ownerId } });
          const isDirect = Number(entryUser?.invitedBy) === Number(user.invitedBy);

          const slot = manager.create(MatrixSlot, {
            matrixId: superiorMatrix.id,
            slotNumber: nextSlot,
            userId: matrix.ownerId,
            isNewUser: false,
            isDirect,
            incomeAmount,
            incomeType,
            remainingFund,
            reentryCount,
          });
          await manager.save(MatrixSlot, slot);

          superiorMatrix.filledCount += 1;

          if (incomeAmount > 0) {
            const income = manager.create(MatrixIncome, {
              ownerId: user.invitedBy,
              matrixId: superiorMatrix.id,
              slotNumber: nextSlot,
              fromUserId: matrix.ownerId,
              amount: incomeAmount,
              incomeType,
              description: `老用户出局后再次入位第${nextSlot}号坑位`,
            });
            await manager.save(MatrixIncome, income);

            if (incomeType === 'claimable') {
              superiorMatrix.claimableIncome = Number(superiorMatrix.claimableIncome) + incomeAmount;
            } else if (incomeType === 'next_fund') {
              superiorMatrix.nextRoundFund = Number(superiorMatrix.nextRoundFund) + incomeAmount;
            }
          }

          await manager.save(Matrix, superiorMatrix);

          // 如果进入了第二层-6号位），同时也要进入对应一层用户的矩阵
          if (nextSlot >= 3) {
            await this.cascadeIntoFirstLayerUserMatrix(
              matrix.ownerId, nextSlot, superiorMatrix.id, false, manager,
            );
          }

          if (superiorMatrix.filledCount >= 6) {
            await this.handleMatrixComplete(superiorMatrix, manager);
          }
        }
      }
    }
  }

  /**
   * 进入上级矩阵第二层时，同时进入对应一层用户的矩阵
   * 3号位 进入1号位用户的矩阵
   * 5号位 进入2号位用户的矩阵
   */
  private async cascadeIntoFirstLayerUserMatrix(
    userId: number,
    slotNumber: number,
    superiorMatrixId: number,
    isNewUser: boolean,
    manager: any,
  ): Promise<void> {
    // 确定对应的一层用户
    let firstLayerSlotNumber: number;
    if (slotNumber === 3 || slotNumber === 4) {
      firstLayerSlotNumber = 1;
    } else if (slotNumber === 5 || slotNumber === 6) {
      firstLayerSlotNumber = 2;
    } else {
      return;
    }

    // 找到一层用户
    const firstLayerSlot = await manager.findOne(MatrixSlot, {
      where: { matrixId: superiorMatrixId, slotNumber: firstLayerSlotNumber },
    });
    if (!firstLayerSlot) return;

    const firstLayerUserId = firstLayerSlot.userId;

    // 找到一层用户的当前进行中矩阵
    let firstLayerMatrix = await manager.findOne(Matrix, {
      where: { ownerId: firstLayerUserId, status: 1 },
    });
    if (!firstLayerMatrix) {
      firstLayerMatrix = manager.create(Matrix, {
        ownerId: firstLayerUserId,
        round: 1,
        status: 1,
        filledCount: 0,
        startFund: 0,
      });
      firstLayerMatrix = await manager.save(Matrix, firstLayerMatrix);
    }

    if (firstLayerMatrix.filledCount >= 6) return;

    // 检查是否已经在该矩阵中
    const existing = await manager.findOne(MatrixSlot, {
      where: { matrixId: firstLayerMatrix.id, userId },
    });
    if (existing) return;

    // 找第一个空位（1
    const occupiedSlots = await manager.find(MatrixSlot, { where: { matrixId: firstLayerMatrix.id } });
    const occupied = new Set(occupiedSlots.map((s: any) => s.slotNumber));
    let targetSlot = 0;
    for (let i = 1; i <= 6; i++) {
      if (!occupied.has(i)) { targetSlot = i; break; }
    }
    if (targetSlot === 0) return;

    // 计算收益
    const { incomeAmount, incomeType, remainingFund, reentryCount } =
      await this.calculateSlotIncomeByRound(targetSlot, isNewUser, userId, manager);

    const entryUser = await manager.findOne(User, { where: { id: userId } });
    const isDirect = Number(entryUser?.invitedBy) === Number(firstLayerUserId);

    const newSlot = manager.create(MatrixSlot, {
      matrixId: firstLayerMatrix.id,
      slotNumber: targetSlot,
      userId,
      isNewUser,
      isDirect,
      incomeAmount,
      incomeType,
      remainingFund,
      reentryCount,
    });
    await manager.save(MatrixSlot, newSlot);

    firstLayerMatrix.filledCount += 1;

    if (incomeAmount > 0) {
      const income = manager.create(MatrixIncome, {
        ownerId: firstLayerUserId,
        matrixId: firstLayerMatrix.id,
        slotNumber: targetSlot,
        fromUserId: userId,
        amount: incomeAmount,
        incomeType,
        description: `用户补位入第${targetSlot}号坑位`,
      });
      await manager.save(MatrixIncome, income);

      if (incomeType === 'claimable') {
        firstLayerMatrix.claimableIncome = Number(firstLayerMatrix.claimableIncome) + incomeAmount;
      } else if (incomeType === 'next_fund') {
        firstLayerMatrix.nextRoundFund = Number(firstLayerMatrix.nextRoundFund) + incomeAmount;
      }
    }

    await manager.save(Matrix, firstLayerMatrix);

    if (firstLayerMatrix.filledCount >= 6) {
      await this.handleMatrixComplete(firstLayerMatrix, manager);
    }
  }

  /**
   * 计算出局后再次入位的坑位
   * 规则：查找上级矩阵中该用户还没占过的空位，优先顺序2
   * 实际规则：从上到下，从左到右，跳过自己已经占的位置
   */
  private async calculateReentrySlot(
    userId: number,
    matrixId: number,
    manager: any,
  ): Promise<number> {
    const occupiedSlots = await manager.find(MatrixSlot, { where: { matrixId } });
    const occupied = new Set(occupiedSlots.map((s: any) => s.slotNumber));

    // 找出该用户已经占过的位置
    const mySlots = occupiedSlots
      .filter((s: any) => Number(s.userId) === Number(userId))
      .map((s: any) => s.slotNumber);

    // 按从上到下、左到右的顺序找空位置
    // 跳过已经被占的位置
    for (const slot of [1, 2, 3, 4, 5, 6]) {
      if (!occupied.has(slot)) return slot;
    }

    return 0; // 没有空位
  }

  /**
   * 仅填充单个矩阵的坑位（不向上递归），用于出局后跟随上级入位
   */
  private async fillSingleMatrix(
    userId: number,
    targetOwnerId: number,
    currentMatrix: Matrix,
    isNewUser: boolean,
    manager: any,
  ): Promise<void> {
    // 检查该用户是否已经在这个矩阵中
    const existingSlot = await manager.findOne(MatrixSlot, {
      where: { matrixId: currentMatrix.id, userId },
    });
    if (existingSlot) return;

    if (currentMatrix.filledCount >= 6) return;

    const nextSlotNumber = await this.calculateTreeSlot(
      userId, targetOwnerId, currentMatrix.id, manager,
    );
    if (nextSlotNumber === 0) return;

    const { incomeAmount, incomeType, remainingFund, reentryCount } =
      await this.calculateSlotIncomeByRound(nextSlotNumber, isNewUser, userId, manager);

    const actualIncomeAmount = incomeAmount;
    const actualRemainingFund = remainingFund;
    const actualReentryCount = reentryCount;

    // 判断是否为矩阵顶点的直推用户
    const entryUser = await manager.findOne(User, { where: { id: userId } });
    const isDirect = Number(entryUser?.invitedBy) === Number(targetOwnerId);

    const slot = manager.create(MatrixSlot, {
      matrixId: currentMatrix.id,
      slotNumber: nextSlotNumber,
      userId,
      isNewUser,
      isDirect,
      incomeAmount: actualIncomeAmount,
      incomeType,
      remainingFund: actualRemainingFund,
      reentryCount: actualReentryCount,
    });
    await manager.save(MatrixSlot, slot);

    currentMatrix.filledCount += 1;

    if (actualIncomeAmount > 0) {
      const income = manager.create(MatrixIncome, {
        ownerId: targetOwnerId,
        matrixId: currentMatrix.id,
        slotNumber: nextSlotNumber,
        fromUserId: userId,
        amount: actualIncomeAmount,
        incomeType,
        description: `老用户出局后跟随入位第${nextSlotNumber}号坑位（{actualReentryCount}次）`,
      });
      await manager.save(MatrixIncome, income);

      if (incomeType === 'next_fund') {
        currentMatrix.nextRoundFund = Number(currentMatrix.nextRoundFund) + actualIncomeAmount;
      }
    }

    await manager.save(Matrix, currentMatrix);

    // 矩阵满员后自动出局进入下一轮
    if (currentMatrix.filledCount >= 6) {
      await this.handleMatrixComplete(currentMatrix, manager);
    }
  }

  /**
   * 老用户出局后重新跟随上级入位
   * 当用户完成自己的矩阵出局后，检查是否需要跟随上级进入上级的矩阵
   */
  async onUserCompleteMatrix(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.invitedBy) return;

    // 检查上级是否有进行中的矩阵且有空位
    const superiorMatrix = await this.matrixRepo.findOne({
      where: { ownerId: user.invitedBy, status: 1 },
    });
    if (!superiorMatrix || superiorMatrix.filledCount >= 6) return;

    // 检查是否已经在上级矩阵
    const existing = await this.slotRepo.findOne({
      where: { matrixId: superiorMatrix.id, userId },
    });
    if (existing) return;

    // 作为老用户入位上级矩阵
    await this.dataSource.transaction(async (manager) => {
      await this.fillUpwardMatrices(userId, user.invitedBy, false, manager);
    });
  }

  // ==================== 查询接口 ====================

  /**
   * 获取用户当前矩阵信息
   */
  async getCurrentMatrix(userId: number) {
    await this.completeFullActiveMatrixIfNeeded(userId);

    const matrix = await this.matrixRepo.findOne({
      where: { ownerId: userId, status: 1 },
    });
    if (!matrix) return null;

    const slots = await this.slotRepo.find({
      where: { matrixId: matrix.id },
      order: { slotNumber: 'ASC' },
    });

    // 获取坑位用户信息（含上级昵称
    const slotDetails = await Promise.all(
      slots.map(async (slot) => {
        const user = await this.userRepo.findOne({
          where: { id: slot.userId },
          select: ['id', 'nickname', 'avatar', 'account', 'invitedBy'],
        });
        let inviterNickname: string | null = null;
        if (user?.invitedBy) {
          const inviter = await this.userRepo.findOne({
            where: { id: user.invitedBy },
            select: ['id', 'nickname', 'account'],
          });
          inviterNickname = inviter?.nickname || inviter?.account || null;
        }
        return { ...slot, user: user ? { ...user, inviterNickname } : null };
      }),
    );

    return { matrix, slots: slotDetails };
  }

  /**
   * 获取用户矩阵历史
   */
  async getMatrixHistory(userId: number) {
    return this.matrixRepo.find({
      where: { ownerId: userId },
      order: { round: 'DESC' },
    });
  }

  /**
   * 获取用户可领取收益
   */
  async getClaimableIncome(userId: number) {
    const incomes = await this.incomeRepo.find({
      where: { ownerId: userId, incomeType: 'claimable', isClaimed: false },
      order: { createdAt: 'DESC' },
    });
    const total = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    return { total, list: incomes };
  }

  /**
   * 领取收益
   */
  async claimIncome(userId: number): Promise<number> {
    const { total, list } = await this.getClaimableIncome(userId);
    if (total <= 0) throw new BadRequestException('暂无可领取收益');

    await this.dataSource.transaction(async (manager) => {
      for (const income of list) {
        income.isClaimed = true;
        income.claimedAt = new Date();
        await manager.save(MatrixIncome, income);
      }
    });

    // 将收益转入用户积分账户
    await this.currencyService.changeCurrency(
      userId,
      'points',
      total,
      'matrix_income',
      `矩阵推广收益领取`,
    );

    return total;
  }

  /**
   * 获取用户的矩阵统计信息
   */
  async getMatrixStats(userId: number) {
    const totalMatrices = await this.matrixRepo.count({ where: { ownerId: userId } });
    const completedMatrices = await this.matrixRepo.count({ where: { ownerId: userId, status: 2 } });
    const currentMatrix = await this.matrixRepo.findOne({ where: { ownerId: userId, status: 1 } });

    const totalClaimable = await this.incomeRepo
      .createQueryBuilder('i')
      .select('SUM(i.amount)', 'total')
      .where('i.owner_id = :userId', { userId })
      .andWhere('i.income_type = :type', { type: 'claimable' })
      .getRawOne();

    const totalClaimed = await this.incomeRepo
      .createQueryBuilder('i')
      .select('SUM(i.amount)', 'total')
      .where('i.owner_id = :userId', { userId })
      .andWhere('i.income_type = :type', { type: 'claimable' })
      .andWhere('i.is_claimed = true')
      .getRawOne();

    return {
      totalMatrices,
      completedMatrices,
      currentRound: currentMatrix?.round || 0,
      currentFilled: currentMatrix?.filledCount || 0,
      totalEarned: Number(totalClaimable?.total || 0),
      totalClaimed: Number(totalClaimed?.total || 0),
      pendingClaim: Number(totalClaimable?.total || 0) - Number(totalClaimed?.total || 0),
    };
  }

  /**
   * 获取直推用户列表
   */
  async getDirectUsers(userId: number) {
    const users = await this.userRepo.find({
      where: { invitedBy: userId },
      select: ['id', 'account', 'nickname', 'avatar', 'registerTime', 'isActivated'],
      order: { registerTime: 'DESC' },
    });

    // 查询每个直推用户的矩阵完成情况
    const result = await Promise.all(
      users.map(async (user) => {
        const completedCount = await this.matrixRepo.count({
          where: { ownerId: user.id, status: 2 },
        });
        const currentMatrix = await this.matrixRepo.findOne({
          where: { ownerId: user.id, status: 1 },
        });
        return {
          id: user.id,
          account: user.account,
          nickname: user.nickname,
          avatar: user.avatar,
          registerTime: user.registerTime,
          completedRounds: completedCount,
          currentFilled: currentMatrix?.filledCount || 0,
        };
      }),
    );

    return result;
  }

  /**
   * 获取已完成矩阵的详情（含坑位用户和直推标注）
   */
  async getCompletedRounds(userId: number) {
    const matrices = await this.matrixRepo.find({
      where: { ownerId: userId, status: 2 },
      order: { round: 'ASC' },
    });

    const result = await Promise.all(
      matrices.map(async (matrix) => {
        const slots = await this.slotRepo.find({
          where: { matrixId: matrix.id },
          order: { slotNumber: 'ASC' },
        });

        const slotDetails = await Promise.all(
          slots.map(async (slot) => {
            const user = await this.userRepo.findOne({
              where: { id: slot.userId },
              select: ['id', 'account', 'nickname', 'avatar', 'invitedBy'],
            });
            return {
              slotNumber: slot.slotNumber,
              isNewUser: slot.isNewUser,
              incomeAmount: slot.incomeAmount,
              incomeType: slot.incomeType,
              user: user ? {
                id: user.id,
                account: user.account,
                nickname: user.nickname,
                avatar: user.avatar,
                isDirect: Number(user.invitedBy) === Number(userId), // 是否是当前用户的直推
              } : null,
            };
          }),
        );

        return {
          round: matrix.round,
          completedAt: matrix.completedAt,
          claimableIncome: matrix.claimableIncome,
          nextRoundFund: matrix.nextRoundFund,
          slots: slotDetails,
        };
      }),
    );

    return result;
  }

  /**
   * 手动进入下一轮（用户点击按钮触发）
   * 前提：当前矩阵已满 6 人
   */
  async enterNextRound(userId: number) {
    const currentMatrix = await this.matrixRepo.findOne({
      where: { ownerId: userId, status: 1 },
    });

    if (!currentMatrix) {
      throw new BadRequestException('没有进行中的矩阵');
    }

    if (currentMatrix.filledCount < 6) {
      throw new BadRequestException('当前矩阵未满员，请先完成推广任务');
    }

    // 执行出局逻辑
    await this.dataSource.transaction(async (manager) => {
      await this.handleMatrixComplete(currentMatrix, manager);
    });

    return { message: '已成功进入下一轮' };
  }

  /**
   * 获取指定用户的当前轮次和资金信息
   */
  async getUserRoundInfo(userId: number) {
    const completedCount = await this.matrixRepo.count({
      where: { ownerId: userId, status: 2 },
    });
    const currentRound = completedCount + 1;

    // 获取当前矩阵的实际启动资金
    let currentFund = DEFAULT_START_FUND;
    const currentMatrix = await this.matrixRepo.findOne({
      where: { ownerId: userId, status: 1 },
    });
    if (currentMatrix && Number(currentMatrix.startFund) > 0) {
      currentFund = Number(currentMatrix.startFund);
    }

    return {
      currentRound,
      currentFund,
      completedMatrices: completedCount,
    };
  }

  /**
   * 获取收益明细（当前矩阵+ 已完成矩阵的每个坑位收益
   */
  async getIncomeDetail(userId: number) {
    // 获取所有矩阵（包括当前进行中的和已完成的）
    const matrices = await this.matrixRepo.find({
      where: { ownerId: userId },
      order: { round: 'ASC' },
    });

    const result = await Promise.all(
      matrices.map(async (matrix) => {
        const slots = await this.slotRepo.find({
          where: { matrixId: matrix.id },
          order: { slotNumber: 'ASC' },
        });

        const slotDetails = await Promise.all(
          slots.map(async (slot) => {
            const user = await this.userRepo.findOne({
              where: { id: slot.userId },
              select: ['id', 'account', 'nickname'],
            });
            return {
              slotNumber: slot.slotNumber,
              isNewUser: slot.isNewUser,
              incomeAmount: slot.incomeAmount,
              incomeType: slot.incomeType,
              user: user ? {
                id: user.id,
                account: user.account,
                nickname: user.nickname,
              } : null,
            };
          }),
        );

        // 计算本轮总可领取收益和下轮资金
        const roundClaimable = slotDetails
          .filter(s => s.incomeType === 'claimable')
          .reduce((sum, s) => sum + Number(s.incomeAmount), 0);
        const roundNextFund = slotDetails
          .filter(s => s.incomeType === 'next_fund')
          .reduce((sum, s) => sum + Number(s.incomeAmount), 0);

        return {
          round: matrix.round,
          status: matrix.status === 1 ? '进行中' : '已完成',
          claimableIncome: roundClaimable,
          nextRoundFund: roundNextFund,
          slots: slotDetails,
        };
      }),
    );

    // 汇总
    const totalClaimable = result.reduce((sum, r) => sum + r.claimableIncome, 0);
    const totalNextFund = result.reduce((sum, r) => sum + r.nextRoundFund, 0);

    return {
      totalClaimable: totalClaimable,
      totalNextFund: totalNextFund,
      rounds: result,
    };
  }
}
