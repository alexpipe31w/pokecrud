import { Component, input } from '@angular/core';

/**
 * Marcador temporal para las pantallas que aún no están implementadas.
 * Cada historia de usuario reemplaza el placeholder de su pantalla por el contenido real.
 */
@Component({
  selector: 'app-page-placeholder',
  templateUrl: './page-placeholder.component.html',
  styleUrls: ['./page-placeholder.component.scss'],
})
export class PagePlaceholderComponent {
  /** Nombre de la pantalla. */
  readonly title = input.required<string>();
  /** Historia(s) de Jira donde se implementa. */
  readonly issue = input<string>();
}
