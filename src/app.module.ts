import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { EventsConsumer } from './events.consumer';
import { EventsProducer } from './events.producer';
import { kafkaClientProvider } from './kafka.config';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [ClientsModule.register([kafkaClientProvider()]), CatalogModule],
  controllers: [AppController, EventsConsumer],
  providers: [EventsProducer]
})
export class AppModule {}

