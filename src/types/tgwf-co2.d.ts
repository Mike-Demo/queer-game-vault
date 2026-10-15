/**
 * Ambient types for @tgwf/co2 (v0.19.0). The package ships no declarations, so
 * this covers the SWD model surface the footer carbon estimate uses.
 */
declare module "@tgwf/co2" {
  interface CO2ConstructorOptions {
    model?: "swd" | "1byte";
    version?: 3 | 4;
    rating?: boolean;
  }

  class CO2 {
    constructor(options?: CO2ConstructorOptions);
    perByte(bytes: number, green?: boolean): number;
  }

  export { CO2 as co2 };
}
