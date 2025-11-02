import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlayerResultDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  display_name: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  final_score: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  correct_answers: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_answers: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  accuracy: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  average_response_ms: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_streak: number;
}

export class AnswerResultDto {
  @IsUUID()
  user_id: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  question_index: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  answer: string;

  @IsBoolean()
  is_correct: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  response_time_ms: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  score_delta: number;

  @IsDateString()
  answered_at: string;
}

export class SubmitGameResultsDto {
  @IsUUID()
  room_id: string;

  @IsUUID()
  quiz_id: string;

  @IsUUID()
  host_id: string;

  @IsDateString()
  started_at: string;

  @IsDateString()
  ended_at: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration_ms: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  total_questions: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlayerResultDto)
  player_results: PlayerResultDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerResultDto)
  answers: AnswerResultDto[];
}
