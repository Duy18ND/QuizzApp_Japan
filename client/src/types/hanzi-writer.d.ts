declare module 'hanzi-writer' {
  export interface HanziWriterOptions {
    width?: number;
    height?: number;
    padding?: number;
    showOutline?: boolean;
    strokeAnimationSpeed?: number;
    strokeFadeDuration?: number;
    strokeWidth?: number;
    outlineColor?: string;
    strokeColor?: string;
    radicalColor?: string;
    highlightColor?: string;
    showCharacter?: boolean;
    showHintAfterMisses?: number;
    highlightOnComplete?: boolean;
    highlightCompleteColor?: string;
    drawingWidth?: number;
    drawingColor?: string;
    drawingFadeDuration?: number;
    leniency?: number;
    charDataLoader?: (char: string, onLoad: (data: any) => void, onError: (err: any) => void) => void;
  }

  export default class HanziWriter {
    static create(element: string | HTMLElement, character: string, options?: HanziWriterOptions): HanziWriter;
    static loadCharacterData(character: string, options?: HanziWriterOptions): Promise<any>;

    showCharacter(): void;
    hideCharacter(): void;
    animateCharacter(): void;
    animateStroke(strokeNum: number): void;
    loopCharacterAnimation(): void;
    quiz(quizOptions?: any): void;
    cancelQuiz(): void;
    setCharacter(character: string): void;
    updateDimensions(options: { width: number, height: number }): void;
    destroy(): void;
  }
}
