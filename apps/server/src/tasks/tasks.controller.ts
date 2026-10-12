import { Controller, NotFoundException, Res } from "@nestjs/common";
import { Implement, implement, ORPCError } from "@orpc/nest";
import type { Response } from "express";

import { contract } from "@boilerplate/contract";

import { TasksService } from "./tasks.service.js";

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // Непомеченный @Res() выключает automatic response application у Nest —
  // см. комментарий в notes.controller.ts, та же причина здесь.
  @Implement(contract.tasks)
  implementTasks(@Res() _res: Response) {
    return {
      list: implement(contract.tasks.list).handler(() => this.tasks.findAll()),

      create: implement(contract.tasks.create).handler(({ input }) => this.tasks.create(input)),

      toggle: implement(contract.tasks.toggle).handler(async ({ input }) => {
        try {
          return await this.tasks.toggle(input.id);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ORPCError("NOT_FOUND", { message: error.message, data: { id: input.id } });
          }
          throw error;
        }
      }),

      remove: implement(contract.tasks.remove).handler(async ({ input }) => {
        try {
          await this.tasks.delete(input.id);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ORPCError("NOT_FOUND", { message: error.message, data: { id: input.id } });
          }
          throw error;
        }
      }),
    };
  }
}
