import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from './storage.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, StorageService],
  exports: [MediaService],
})
export class MediaModule {}
