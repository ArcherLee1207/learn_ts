let a: {
  b?: number,
  c?: string | undefined,
  [key: number]: boolean,
}

a = { b: 1 }
a = {
  b: 1,
  c: undefined,
}
a = {
  b: 1,
  c: 'd',
}
a = { 23: true }