import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PageVersionsController } from './page-versions.controller';
import { PageVersionsService } from './page-versions.service';
import { PublicPagesController } from './public-pages.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PagesController, PageVersionsController, PublicPagesController],
  providers: [PagesService, PageVersionsService],
  exports: [PagesService, PageVersionsService],
})
export class PagesModule {}
