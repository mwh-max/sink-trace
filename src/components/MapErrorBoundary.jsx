import React from "react";
import { COLOR_CRITICAL } from "../utils/colors.js";

export default class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", color: COLOR_CRITICAL }}>
          Map failed to load. Please refresh to try again.
        </div>
      );
    }
    return this.props.children;
  }
}
