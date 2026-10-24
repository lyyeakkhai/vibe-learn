import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthModuleService } from './auth-module.service';
import { CreateAuthModuleDto } from './dto/create-auth-module.dto';
import { UpdateAuthModuleDto } from './dto/update-auth-module.dto';

@Controller('auth-module')
export class AuthModuleController {
  constructor(private readonly authModuleService: AuthModuleService) {}

  @Post()
  create(@Body() createAuthModuleDto: CreateAuthModuleDto) {
    return this.authModuleService.create(createAuthModuleDto);
  }

  @Get()
  findAll() {
    return this.authModuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authModuleService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuthModuleDto: UpdateAuthModuleDto,
  ) {
    return this.authModuleService.update(+id, updateAuthModuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authModuleService.remove(+id);
  }
}
