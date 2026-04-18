import { IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdatePublicKeyDto {
  @ApiProperty({ description: 'RSA-OAEP public key in JWK format' })
  @IsString()
  @MaxLength(2048)
  publicKey: string
}
