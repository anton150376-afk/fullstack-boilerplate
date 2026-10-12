import { Module } from "@nestjs/common";

import { FilesController } from "./files.controller.js";
import { FilesRepository } from "./files.repository.js";
import { FilesService } from "./files.service.js";
import { storageAdapterProvider } from "./storage.provider.js";

@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, storageAdapterProvider],
})
export class FilesModule {}
