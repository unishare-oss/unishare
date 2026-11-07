import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'

/** A v1 identity event from uniauth: form-encoded `token`, a JWT signed by uniauth. */
export class UniauthEventDto {
  @ApiProperty()
  @IsString()
  @MaxLength(8192)
  token: string
}
