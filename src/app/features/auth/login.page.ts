import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../core/auth/auth.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
import { AuthForm } from './auth-form';

/** Inicio de sesión (F0-07). */
@Component({
  selector: 'app-login',
  imports: [IonContent, ReactiveFormsModule, RouterLink, GlassPanelComponent, GameButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './auth-form.scss',
})
export class LoginPage extends AuthForm {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  protected invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) return Promise.resolve();
    return this.run(() => this.auth.login(this.form.getRawValue()));
  }
}
