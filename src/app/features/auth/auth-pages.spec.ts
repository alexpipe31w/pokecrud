import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { LoginPage } from './login.page';
import { RegisterPage } from './register.page';

@Component({ template: 'destino' })
class TargetPage {}

describe('Pantallas de login y registro', () => {
  const auth = { login: vi.fn(), register: vi.fn() };
  let harness: RouterTestingHarness;

  const el = <T extends Element>(selector: string) =>
    harness.routeNativeElement!.querySelector(selector) as T;
  const type = (selector: string, value: string) => {
    const input = el<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  const text = () => harness.routeNativeElement!.textContent ?? '';

  beforeEach(async () => {
    auth.login.mockReset().mockResolvedValue(undefined);
    auth.register.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: LoginPage },
          { path: 'registro', component: RegisterPage },
          { path: 'dev/ui', component: TargetPage },
          { path: '', component: TargetPage },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  describe('login', () => {
    beforeEach(async () => {
      await harness.navigateByUrl('/login?redirect=%2Fdev%2Fui');
    });

    it('con campos vacíos muestra los errores en línea y no llama al servidor', async () => {
      await submit();
      expect(text()).toContain('Escribe un correo válido');
      expect(text()).toContain('Escribe tu contraseña');
      expect(auth.login).not.toHaveBeenCalled();
    });

    it('con datos válidos inicia sesión y vuelve a la página pedida', async () => {
      type('input[name=email]', 'ash@pokecrud.test');
      type('input[name=password]', 'clave-segura-123');
      await submit();
      expect(auth.login).toHaveBeenCalledWith({
        email: 'ash@pokecrud.test',
        password: 'clave-segura-123',
      });
      expect(TestBed.inject(Router).url).toBe('/dev/ui');
    });

    it('si el servidor rechaza, muestra su mensaje en español', async () => {
      auth.login.mockRejectedValue(
        new HttpErrorResponse({
          status: 401,
          error: { message: 'Correo o contraseña incorrectos' },
        }),
      );
      type('input[name=email]', 'ash@pokecrud.test');
      type('input[name=password]', 'mala-clave-123');
      await submit();
      expect(el('[role=alert]').textContent).toContain('Correo o contraseña incorrectos');
      expect(TestBed.inject(Router).url).toContain('/login');
    });
  });

  describe('registro', () => {
    beforeEach(async () => {
      await harness.navigateByUrl('/registro');
    });

    it('valida apodo y contraseña antes de enviar', async () => {
      type('input[name=email]', 'ash@pokecrud.test');
      type('input[name=nickname]', 'no!');
      type('input[name=password]', 'corta');
      await submit();
      expect(text()).toContain('De 3 a 20 letras, números o _');
      expect(text()).toContain('Mínimo 8 caracteres');
      expect(auth.register).not.toHaveBeenCalled();
    });

    it('un apodo repetido (409) se muestra bajo el campo del apodo', async () => {
      auth.register.mockRejectedValue(
        new HttpErrorResponse({ status: 409, error: { message: 'Ese apodo ya está en uso' } }),
      );
      type('input[name=email]', 'ash@pokecrud.test');
      type('input[name=nickname]', 'ash_ketchum');
      type('input[name=password]', 'clave-segura-123');
      await submit();
      expect(el('#nickname-error').textContent).toContain('Ese apodo ya está en uso');
    });

    it('con datos válidos crea la cuenta y entra', async () => {
      type('input[name=email]', 'ash@pokecrud.test');
      type('input[name=nickname]', 'ash_ketchum');
      type('input[name=password]', 'clave-segura-123');
      await submit();
      expect(auth.register).toHaveBeenCalledWith({
        email: 'ash@pokecrud.test',
        nickname: 'ash_ketchum',
        password: 'clave-segura-123',
      });
      expect(TestBed.inject(Router).url).toBe('/');
    });
  });
});
