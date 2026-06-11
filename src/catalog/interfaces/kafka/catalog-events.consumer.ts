import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { CatalogSellerStatus } from '../../domain/catalog-types';
import { SyncSellerStatusUseCase } from '../../application/use-cases/sync-seller-status.use-case';

type SellerEventPayload = {
  sellerId?: string;
  authUserId?: string;
  email?: string;
};

@Controller()
export class CatalogEventsConsumer {
  constructor(private readonly syncSellerStatusUseCase: SyncSellerStatusUseCase) {}

  @EventPattern('seller.application.submitted.v1')
  async handleSellerApplicationSubmitted(@Payload() payload: SellerEventPayload, @Ctx() context: KafkaContext): Promise<void> {
    if (payload.sellerId && payload.authUserId) {
      await this.syncSellerStatusUseCase.applicationSubmitted({
        sellerId: payload.sellerId,
        authUserId: payload.authUserId,
        email: payload.email
      });
    }

    this.logConsumed(context, payload);
  }

  @EventPattern('seller.approved.v1')
  async handleSellerApproved(@Payload() payload: SellerEventPayload, @Ctx() context: KafkaContext): Promise<void> {
    await this.updateStatus(payload, 'ACTIVE');
    this.logConsumed(context, payload);
  }

  @EventPattern('seller.reactivated.v1')
  async handleSellerReactivated(@Payload() payload: SellerEventPayload, @Ctx() context: KafkaContext): Promise<void> {
    await this.updateStatus(payload, 'ACTIVE');
    this.logConsumed(context, payload);
  }

  @EventPattern('seller.suspended.v1')
  async handleSellerSuspended(@Payload() payload: SellerEventPayload, @Ctx() context: KafkaContext): Promise<void> {
    await this.updateStatus(payload, 'SUSPENDED');
    this.logConsumed(context, payload);
  }

  @EventPattern('seller.rejected.v1')
  async handleSellerRejected(@Payload() payload: SellerEventPayload, @Ctx() context: KafkaContext): Promise<void> {
    await this.updateStatus(payload, 'REJECTED');
    this.logConsumed(context, payload);
  }

  private async updateStatus(payload: SellerEventPayload, status: CatalogSellerStatus): Promise<void> {
    if (!payload.sellerId) {
      return;
    }

    await this.syncSellerStatusUseCase.statusChanged({ sellerId: payload.sellerId, status });
  }

  private logConsumed(context: KafkaContext, payload: unknown): void {
    console.log('[catalog-service] consumed integration event', {
      topic: context.getTopic(),
      partition: context.getPartition(),
      offset: context.getMessage().offset,
      payload
    });
  }
}
