import { Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DEFAULT_SERVICE_NAME } from './kafka.constants';
import { EventsProducer } from './events.producer';

@ApiTags('catalog-service')
@Controller()
export class AppController {
  constructor(private readonly eventsProducer: EventsProducer) {}

  @ApiOperation({ summary: 'Check service health' })
  @ApiOkResponse({
    schema: {
      example: {
        service: 'catalog-service',
        status: 'ok'
      }
    }
  })
  @Get('health')
  health() {
    return {
      service: process.env.SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
      status: 'ok'
    };
  }

  @ApiOperation({ summary: 'Publish a demo Kafka event' })
  @ApiOkResponse({
    schema: {
      example: {
        topic: 'catalog.demo.event.v1',
        payload: {
          service: 'catalog-service',
          message: 'demo event produced',
          createdAt: '2026-05-24T00:00:00.000Z'
        }
      }
    }
  })
  @Post('events/demo')
  publishDemoEvent() {
    return this.eventsProducer.publishDemoEvent();
  }
}
