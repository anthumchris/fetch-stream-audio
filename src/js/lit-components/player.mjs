import { render } from 'lit-html';
import { BaseLitComponent } from './base-lit-component.mjs';
import template from './player-template.mjs';

export class Player extends BaseLitComponent {
  _container;

  constructor(container) {
    super();
    this._container = container;
    this.state.onClick = this._onClick;
  }

  _onClick = (e) => {
    let el = e.target;
    let action = el.dataset.action;

    while (el.parentElement && !action) {
      el = el.parentElement;
      action = el.dataset.action;
    }

    if (this.onAction) {
      this.onAction(action);
    }
  }

  render() {
    render(template(this.state), this._container);
  }
}