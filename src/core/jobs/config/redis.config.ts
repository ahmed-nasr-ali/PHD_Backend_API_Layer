/** How to reach Redis, read once from .env (REDIS_URL). On Azure the URL holds a password: never log it. */
export class RedisConfig {
  readonly url: string;

  constructor(values: RedisConfig) {
    this.url = values.url;
  }
}
