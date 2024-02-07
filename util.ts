

function indent(text: string, size: number) {
  let lines = text.split('\n')
  const prefix = ' '.repeat(size)
  lines = lines.map(line => prefix + line + '\n')
  const tout = lines.join('')
  return tout
}



export {
  indent
}
