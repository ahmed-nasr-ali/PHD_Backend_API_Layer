export class DataverseConfig {
  readonly url: string;
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;

  constructor(values: DataverseConfig) {
    this.url = values.url;
    this.tenantId = values.tenantId;
    this.clientId = values.clientId;
    this.clientSecret = values.clientSecret;
  }
}
