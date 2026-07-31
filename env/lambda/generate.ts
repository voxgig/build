/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// Shared generation utilities for the lambda templates. File output goes
// through the jostraca templating library (Project/File/Content components),
// which also maintains .jostraca/ build metadata next to the outputs.

import { Jostraca, Project, File, Content } from 'jostraca'


// Generate one or more files in folder, each with exact content.
async function generate(
  folder: string,
  files: { name: string, content: string }[]
) {
  const jostraca = Jostraca()

  await jostraca.generate({ folder }, () => {
    Project({}, () => {
      for (const f of files) {
        File({ name: f.name }, () => {
          Content(f.content)
        })
      }
    })
  })
}


function empty(o: any) {
  return null == o ? true : 0 === Object.keys(o).length
}

// Strip inital newline
function TM(str: string) {
  return str.replace(/^\n/, '')
}


export {
  generate,
  empty,
  TM,
}
