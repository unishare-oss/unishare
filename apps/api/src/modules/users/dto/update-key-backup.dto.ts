import { IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateKeyBackupDto {
  @ApiProperty({
    description:
      'Passphrase-encrypted private key transfer payload (PBKDF2 + AES-GCM JSON blob). Opaque to the server.',
  })
  @IsString()
  @MaxLength(8192)
  keyBackup: string
}
