import { Color, ColorWithDefaults } from '../../src/talk_to_figma_mcp/types/color';

export const testColors: Record<string, Color> = {
  fullyTransparent: { r: 1, g: 0, b: 0, a: 0 },
  fullyOpaque: { r: 1, g: 0, b: 0, a: 1 },
  semiTransparent: { r: 1, g: 0, b: 0, a: 0.5 },
  undefinedOpacity: { r: 1, g: 0, b: 0 },
  
  pureBlack: { r: 0, g: 0, b: 0, a: 1 },
  pureWhite: { r: 1, g: 1, b: 1, a: 1 },
  transparentBlack: { r: 0, g: 0, b: 0, a: 0 },
  
  noRed: { r: 0, g: 0.5, b: 0.8, a: 1 },
  noGreen: { r: 0.5, g: 0, b: 0.8, a: 1 },
  noBlue: { r: 0.5, g: 0.8, b: 0, a: 1 },
};

export const expectedColorWithDefaults: Record<string, ColorWithDefaults> = {
  fullyTransparent: { r: 1, g: 0, b: 0, a: 0 },
  fullyOpaque: { r: 1, g: 0, b: 0, a: 1 },
  semiTransparent: { r: 1, g: 0, b: 0, a: 0.5 },
  undefinedOpacity: { r: 1, g: 0, b: 0, a: 1 },
  
  pureBlack: { r: 0, g: 0, b: 0, a: 1 },
  pureWhite: { r: 1, g: 1, b: 1, a: 1 },
  transparentBlack: { r: 0, g: 0, b: 0, a: 0 },
  
  noRed: { r: 0, g: 0.5, b: 0.8, a: 1 },
  noGreen: { r: 0.5, g: 0, b: 0.8, a: 1 },
  noBlue: { r: 0.5, g: 0.8, b: 0, a: 1 },
};

