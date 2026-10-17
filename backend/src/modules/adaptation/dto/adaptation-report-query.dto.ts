import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class AdaptationReportQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'includeHealthDetails deve ser um valor booleano (true ou false).' })
  includeHealthDetails: boolean = false;
}
