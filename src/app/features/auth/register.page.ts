import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
import { AuthForm } from './auth-form';

type Field = 'email' | 'nickname' | 'password';

/** Registro de un entrenador nuevo (F0-07). Mismas reglas que el DTO del servidor. */
@Component({
  selector: 'app-register',
  imports: [IonContent, ReactiveFormsModule, RouterLink, GlassPanelComponent, GameButtonComponent],
  templateUrl: './register.page.html',
  styleUrl: './auth-form.scss',
})
export class RegisterPage extends AuthForm {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    nickname: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{3,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  /** Error del servidor colocado bajo su campo (correo o apodo ya usados). */
  protected readonly fieldServerError = signal<{ field: Field; message: string } | null>(null);

  protected invalid(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected serverErrorFor(field: Field): string | null {
    const error = this.fieldServerError();
    return error?.field === field ? error.message : null;
  }

  protected submit(): Promise<void> {
    this.submitted.set(true);
    this.fieldServerError.set(null);
    if (this.form.invalid) return Promise.resolve();
    return this.run(
      () => this.auth.register(this.form.getRawValue()),
      (message, err) => {
        if (err.status !== 409) return false;
        this.fieldServerError.set({
          field: message.includes('apodo') ? 'nickname' : 'email',
          message,
        });
        return true;
      },
    );
  }
}
