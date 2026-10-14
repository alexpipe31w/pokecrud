import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import type { CustomPokemon } from '@shared/protocol/course';

import { AudioService } from '../../services/game/audio.service';
import { CustomPokemonService } from '../../services/game/custom-pokemon.service';
import { HapticsService } from '../../services/game/haptics.service';
import { CustomEditorPage } from './custom-editor.page';

const EXISTING: CustomPokemon = {
  id: 3,
  name: 'Flamita',
  types: ['fire'],
  stats: { hp: 50, attack: 60, defense: 40, speed: 70 },
  imageUrl: 'https://example.com/flamita.png',
  description: 'Pequeño',
  createdAt: '',
};

describe('CustomEditorPage', () => {
  let fixture: ComponentFixture<CustomEditorPage>;
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const navigateBack = vi.fn();

  const setup = async (id?: string) => {
    for (const f of [create, update, remove, navigateBack]) f.mockReset();
    create.mockResolvedValue(EXISTING);
    update.mockResolvedValue(EXISTING);
    remove.mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [CustomEditorPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        {
          provide: CustomPokemonService,
          useValue: {
            list: signal([EXISTING]),
            load: vi.fn().mockResolvedValue(undefined),
            byId: (i: number) => (i === 3 ? EXISTING : undefined),
            create,
            update,
            remove,
          },
        },
        { provide: NavController, useValue: { navigateBack } },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomEditorPage);
    if (id) fixture.componentRef.setInput('id', id);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  };
  afterEach(() => TestBed.resetTestingModule());
  const el = () => fixture.nativeElement as HTMLElement;
  const type = (sel: string, value: string) => {
    const i = el().querySelector<HTMLInputElement | HTMLTextAreaElement>(sel)!;
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const button = (text: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  const chip = (label: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button.type')].find(
      (b) => b.textContent?.trim() === label,
    )!;

  it('nuevo: guardar exige nombre y un tipo; los deslizadores cambian las stats; crea con lo elegido', async () => {
    await setup();
    expect(button('Guardar').disabled).toBe(true);
    type('#cp-name', '  Rocoso ');
    expect(button('Guardar').disabled).toBe(true);
    chip('Roca').click();
    fixture.detectChanges();
    expect(button('Guardar').disabled).toBe(false);
    type('#cp-attack', '120');
    expect(el().querySelector('app-stat-bar[data-key="attack"]')?.textContent).toContain('120');
    type('#cp-desc', 'Duro como una roca');
    button('Guardar').click();
    await fixture.whenStable();
    expect(create).toHaveBeenCalledWith({
      name: 'Rocoso',
      types: ['rock'],
      stats: { hp: 50, attack: 120, defense: 50, speed: 50 },
      imageUrl: '',
      description: 'Duro como una roca',
    });
    expect(navigateBack).toHaveBeenCalledWith('/personalizados');
  });

  it('URL de imagen: vista previa; si no carga, silueta; una URL mal escrita no deja guardar', async () => {
    await setup();
    type('#cp-name', 'X');
    chip('Agua').click();
    fixture.detectChanges();
    type('#cp-image', 'https://example.com/x.png');
    const img = el().querySelector<HTMLImageElement>('.preview img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/x.png');
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el().querySelector('.preview .silhouette')).not.toBeNull();
    type('#cp-image', 'no es una url');
    expect(el().textContent).toContain('Escribe una URL que empiece por http');
    expect(button('Guardar').disabled).toBe(true);
  });

  it('editar: arranca con lo guardado, PATCH al guardar y borrar con confirmación', async () => {
    await setup('3');
    expect(el().querySelector<HTMLInputElement>('#cp-name')!.value).toBe('Flamita');
    expect(chip('Fuego').getAttribute('aria-pressed')).toBe('true');
    button('Guardar').click();
    await fixture.whenStable();
    expect(update).toHaveBeenCalledWith(3, {
      name: 'Flamita',
      types: ['fire'],
      stats: { hp: 50, attack: 60, defense: 40, speed: 70 },
      imageUrl: 'https://example.com/flamita.png',
      description: 'Pequeño',
    });
    button('Borrar').click();
    fixture.detectChanges();
    expect(el().querySelector('[role="alertdialog"]')?.textContent).toContain('¿Borrar a Flamita?');
    el().querySelector<HTMLButtonElement>('[role="alertdialog"] button.danger')!.click();
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith(3);
  });
});
