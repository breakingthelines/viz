/**
 * A count with its noun, singular for one: `countLabel(1, 'vote')` is
 * "1 vote", `countLabel(2410, 'reader')` is "2,410 readers".
 */
export function countLabel(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
}
