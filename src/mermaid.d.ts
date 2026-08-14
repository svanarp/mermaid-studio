declare module "mermaid" {
  export interface RenderResult {
    diagramType: string;
    svg: string;
    bindFunctions?: (element: Element) => void;
  }

  export interface MermaidConfig {
    startOnLoad?: boolean;
    securityLevel?: string;
    theme?: string;
    themeVariables?: Record<string, string>;
    flowchart?: { direction?: string };
    [key: string]: unknown;
  }

  interface Mermaid {
    initialize(config: MermaidConfig): void;
    render(
      id: string,
      text: string,
      container?: string | Element
    ): Promise<RenderResult>;
    parse(text: string): Promise<boolean>;
    detectType(text: string): string;
    registerExternalDiagrams(...args: unknown[]): void;
  }

  const mermaid: Mermaid;
  export default mermaid;
}