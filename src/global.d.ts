// Ambient globals: the vendor UMDs (window.React / ReactDOM / Recharts) are loaded before the
// bundle and referenced as globals; the bubblegauge bridge lives on window. Declared `any` for now
// (a strict typing pass is the next incremental phase).
declare const React: any;
declare const ReactDOM: any;
declare const Recharts: any;
interface Window { BubbleGauge?: any; }
