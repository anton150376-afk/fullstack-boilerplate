import { Controller, NotFoundException, Res } from "@nestjs/common";
import { Implement, implement, ORPCError } from "@orpc/nest";
import type { Response } from "express";

import { contract } from "@boilerplate/contract";

import { NotesService } from "./notes.service.js";

// Контроллер без собственного @Controller(path) — путь целиком берётся
// из контракта (раздел "Фаза 5" задания, пункт 5.2): @Implement
// применяет @Get/@Post/... и UseInterceptors(ImplementInterceptor) сам,
// поэтому guard'ы и прочие декораторы Nest продолжают работать как обычно.
@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  // Сервис остаётся транспортно-независимым и бросает обычные исключения
  // Nest — оRPC распознаёт как "определённую" только ORPCError с кодом из
  // contract.errors(), иначе отдаёт непрозрачный 500 (docs/packages/contract.md).
  // Перевод — один раз на границе контроллера.
  //
  // Непомеченный @Res() — не для использования в теле метода, а чтобы
  // выключить automatic response application у Nest (router-execution-context.js,
  // isResponseHandled): ImplementInterceptor сам пишет ответ через
  // StandardServerNode.sendStandardResponse, и без этого параметра Nest
  // пытается отправить его повторно. Для 200 это проходило незаметно, а
  // для DELETE/204 роняло шумный "Cannot remove headers after they are
  // sent" — найдено этим тестом, не по памяти.
  @Implement(contract.notes)
  implementNotes(@Res() _res: Response) {
    return {
      list: implement(contract.notes.list).handler(() => this.notes.findAll()),

      get: implement(contract.notes.get).handler(async ({ input }) => {
        try {
          return await this.notes.findById(input.id);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ORPCError("NOT_FOUND", { message: error.message, data: { id: input.id } });
          }
          throw error;
        }
      }),

      create: implement(contract.notes.create).handler(({ input }) => this.notes.create(input)),

      update: implement(contract.notes.update).handler(async ({ input }) => {
        const { id, ...data } = input;
        try {
          return await this.notes.update(id, data);
        } catch (error) {
          if (error instanceof NotFoundException) {
            throw new ORPCError("NOT_FOUND", { message: error.message, data: { id } });
          }
          throw error;
        }
      }),

      remove: implement(contract.notes.remove).handler(async ({ input }) => {
        try {
          await this.notes.delete(input.id);
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
