import { NestFactory } from '@nestjs/core';
import { ViewModule } from './server/modules/view/view.module';

async function bootstrap() {
  const app = await NestFactory.create(ViewModule);
  await app.listen(3001, '0.0.0.0');
}
bootstrap();
