import { Injectable } from '@nestjs/common';
import type { UploadDocumentsInput } from './upload-documents.input';
import { DocumentsUploadStrategyFactory } from './upload-documents/strategies/documents-upload-strategy.factory';

@Injectable()
export class UploadDocumentsService {
  constructor(private readonly strategies: DocumentsUploadStrategyFactory) {}

  /** Picks the strategy for the input's type and lets it check the documents and queue their upload; returns the job id. */
  async execute(input: UploadDocumentsInput): Promise<string> {
    const strategy = this.strategies.for(input);
    return strategy.execute(input);
  }
}
