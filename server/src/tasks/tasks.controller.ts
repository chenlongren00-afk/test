/** PRD 2.3: task endpoints retain /api/app/tasks paths used by existing clients. */
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TasksService } from './tasks.service';
@Controller('api/app/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Public() @Get() list(@Query() query: any) { return this.tasks.list(query); }
  @Public() @Get(':id') get(@Param('id') id: string) { return this.tasks.get(id); }
  @Roles('poster', 'both') @Post() create(@Req() req: any, @Body() body: any) { return this.tasks.create(req.user.sub, body); }
  @Roles('poster', 'both') @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.tasks.update(id, req.user.sub, body); }
}
  