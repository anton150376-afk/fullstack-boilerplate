import { BadRequestException, Body, Controller, HttpCode, Post } from "@nestjs/common";

import { bugReportRequestSchema } from "./dev-bug-reports.dto.js";
import { DevBugReportsService } from "./dev-bug-reports.service.js";

@Controller("dev/bug-reports")
export class DevBugReportsController {
  constructor(private readonly service: DevBugReportsService) {}

  @Post()
  @HttpCode(204)
  async create(@Body() body: unknown): Promise<void> {
    const result = bugReportRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message));
    }
    await this.service.submit(result.data);
  }
}
