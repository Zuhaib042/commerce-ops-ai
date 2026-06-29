import { Controller, Get, Inject, Query } from '@nestjs/common';
import { parseLimit } from '../../common/query';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}

  @Get('top')
  top(@Query('limit') limit?: string) {
    return this.products.topByMargin(parseLimit(limit, 25, 100));
  }
}
