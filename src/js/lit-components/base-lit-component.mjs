export class BaseLitComponent {
  state = {};

  // sets new values and calls render() if values added/changed
  setState(newProps) {
    let stateChanged = false;

    Object.entries(newProps).forEach(([key, val]) => {
      if (val !== this.state[key]) {
        stateChanged = true;
      }

      this.state[key] = val;
    });

    if (stateChanged) {
      this.render();
    }
  }

  render() {
    throw Error('render() must be implemented by instantiating class.');
  }
}
 