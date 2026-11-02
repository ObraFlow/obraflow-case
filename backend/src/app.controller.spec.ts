import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API health status', () => {
      const status = appController.getStatus();
      expect(status.status).toBe('ok');
      expect(status.service).toBe('ObraFlow API');
      expect(status.version).toBe('1.0.0');
      expect(status.timestamp).toBeDefined();
    });
  });
});
