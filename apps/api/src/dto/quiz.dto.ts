import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateQuizDto {
  @IsString({ message: 'Message must be a string' })
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  message: string;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'], {
    message: 'Difficulty must be easy, medium, or hard',
  })
  difficulty?: string;

  @IsOptional()
  @IsInt({ message: 'Number of questions must be an integer' })
  @Min(5, { message: 'Minimum 5 questions required' })
  @Max(50, { message: 'Maximum 50 questions allowed' })
  numQuestions?: number;

  @IsOptional()
  @IsInt({ message: 'Time limit must be an integer' })
  @Min(30, { message: 'Minimum 30 seconds required' })
  @Max(7200, { message: 'Maximum 2 hours allowed' })
  timeLimit?: number;

  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];
}

export class UpdateQuizDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'], {
    message: 'Status must be draft, published, or archived',
  })
  status?: string;

  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];
}
