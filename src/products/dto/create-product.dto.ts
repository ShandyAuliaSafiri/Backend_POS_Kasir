import { IsString, IsInt, IsUrl } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsInt()
  price: number;

  @IsUrl()
  imageUrl: string;
}
