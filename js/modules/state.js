/**
 * Central Reactive Store for Novin Khodro
 */
export class Store {
  constructor(initialState = {}) {
    this.state = {
      selectedCategory: 'all',
      selectedBrand: 'all',
      searchQuery: '',
      sortBy: 'default',
      calcPrice: 1000,
      calcDownPct: 50,
      calcTenure: 12,
      activeModalCarId: null,
      ...initialState,
    };
    this.listeners = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setState(partial) {
    const prevState = this.state;
    this.state = { ...prevState, ...partial };
    this.notify(prevState);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(prevState) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('Error in Store subscriber:', err);
      }
    }
  }
}
