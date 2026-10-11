import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Correo no válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(8, 72, {
    message: 'La contraseña debe tener entre 8 y 72 caracteres',
  })
  password: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'El apodo debe tener de 3 a 20 letras, números o _',
  })
  nickname: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Correo no válido' })
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(1, 72)
  password: string;
}

export class RefreshTokenDto {
  // randomBytes(32) en base64url = 43 caracteres; margen por si cambia el formato.
  @IsString()
  @Length(20, 128)
  refreshToken: string;
}
