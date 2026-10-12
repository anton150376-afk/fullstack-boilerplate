import { BadRequestException, Controller, NotFoundException, Res } from "@nestjs/common";
import { Implement, implement, ORPCError } from "@orpc/nest";
import type { Response } from "express";

import { contract } from "@boilerplate/contract";

import { FilesService } from "./files.service.js";

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  // @Res() без passthrough — выключает automatic response application у
  // Nest (см. notes.controller.ts): без него ImplementInterceptor и Nest
  // оба пытаются отправить ответ.
  @Implement(contract.files)
  implementFiles(@Res() _res: Response) {
    return {
      createUploadTicket: implement(contract.files.createUploadTicket).handler(({ input }) =>
        this.files.createUploadTicket(input),
      ),

      confirm: implement(contract.files.confirm).handler(async ({ input }) => {
        try {
          return await this.files.confirm(input.id);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ORPCError("NOT_FOUND", { message: error.message, data: { id: input.id } });
          }
          if (error instanceof BadRequestException) {
            throw new ORPCError("BAD_REQUEST", { message: error.message });
          }
          throw error;
        }
      }),
    };
  }
}
