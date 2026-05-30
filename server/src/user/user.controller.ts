import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateNicknameDto } from './dto/update-nickname.dto';
import { ActivateDto } from './dto/activate.dto';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '';
    return this.userService.register(dto, ip);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '';
    return this.userService.login(dto, ip);
  }

  @Get('me')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.userService.getProfile(userId);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'avatars');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname || '.jpg') || '.jpg';
        cb(null, `${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async updateAvatar(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('请选择头像图片');
    const avatarPath = `/uploads/avatars/${file.filename}`;
    return this.userService.updateAvatar(userId, avatarPath);
  }

  @Put('profile/nickname')
  async updateNickname(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateNicknameDto,
  ) {
    return this.userService.updateNickname(userId, dto.nickname);
  }

  @Post('activate')
  async activate(
    @CurrentUser('id') userId: number,
    @Body() dto: ActivateDto,
  ) {
    return this.userService.activate(userId, dto.code);
  }

  @Get('invite/records')
  async getInviteRecords(@CurrentUser('id') userId: number) {
    return this.userService.getInviteRecords(userId);
  }
}
