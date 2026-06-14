import { Component } from 'react';

// Last-resort guard so one bad section can't blank the whole site.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <h1>Well, this is embarrassing.</h1>
          <p>Something went sideways on our end. Try refreshing — your coffee is still safe.</p>
          <a className="btn btn--primary" href="/">Back home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
