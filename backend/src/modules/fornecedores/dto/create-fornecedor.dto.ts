import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFornecedorDto {
  @ApiProperty({ description: 'Razão Social do fornecedor', example: 'Votorantim Cimentos S/A' })
  @IsString()
  @IsNotEmpty({ message: 'A razão social é obrigatória' })
  razaoSocial: string;

  @ApiProperty({ description: 'CNPJ do fornecedor', example: '01.838.723/0001-27' })
  @IsString()
  @IsNotEmpty({ message: 'O CNPJ é obrigatório' })
  cnpj: string;

  @ApiPropertyOptional({ description: 'E-mail para cotações e pedidos', example: 'vendas@votorantim.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone para contato', example: '(11) 3003-0000' })
  @IsString()
  @IsOptional()
  telefone?: string;
}
