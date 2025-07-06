import { IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TransactionItemDto {
  @IsString()
  productId: string;

  @IsInt()
  quantity: number;
}

export class CreateTransactionDto {
  @IsString()
  userId: string;

  @IsInt()
  paidAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];
}
