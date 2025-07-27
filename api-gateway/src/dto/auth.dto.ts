import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  currentPassword: string;

  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
} 