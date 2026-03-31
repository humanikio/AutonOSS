declare module 'csv-parser' {
  import { Transform } from 'stream';
  
  interface Options {
    separator?: string;
    quote?: string;
    escape?: string;
    headers?: boolean | string[];
    strict?: boolean;
    skipEmptyLines?: boolean;
    skipLinesWithError?: boolean;
  }
  
  function csv(options?: Options): Transform;
  export = csv;
}