export interface Utils {
  rnd: (start: number, end: number) => number;
  tensor: (imageURL: string) => Promise<any>;
  mm: () => any[];
}
