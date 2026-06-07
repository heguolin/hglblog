import { Controller, Get } from "@nestjs/common";
import { SystemService, SystemStatus } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("status")
  getStatus(): Promise<SystemStatus> {
    return this.systemService.getStatus();
  }
}
