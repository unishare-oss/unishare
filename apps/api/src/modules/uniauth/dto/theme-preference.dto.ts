import { IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { THEME_IDS } from '@unishare-oss/unitheme'

export class ThemePreferenceDto {
  @ApiProperty({ enum: THEME_IDS })
  @IsIn(THEME_IDS)
  theme!: string
}

export class ThemePreferenceEntity {
  @ApiProperty({ enum: THEME_IDS, nullable: true })
  theme!: string | null
}
