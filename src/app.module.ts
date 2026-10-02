import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { DataverseModule } from './core/dataverse';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DataverseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
