import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { DataverseModule } from './core/dataverse';
import { ApiResponseModule } from './core/api-response';
import { ExceptionFiltersModule } from './core/exception-filters';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FilesModule } from './modules/files/files.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DataverseModule,
    ApiResponseModule,
    ExceptionFiltersModule,
    InvitationsModule,
    AuthenticationModule,
    DocumentsModule,
    FilesModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
