export class DataverseConfig {
  constructor(
    readonly url: string,
    readonly tenantId: string,
    readonly clientId: string,
    readonly clientSecret: string,
  ) {}
}
