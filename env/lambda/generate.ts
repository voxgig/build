/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// Shared generation utilities for the lambda templates. File output goes
// through the jostraca templating library (Project/File/Content components),
// which also maintains .jostraca/ build metadata next to the outputs.

import Fs from 'fs'
import Path from 'path'

import { Jostraca, Project, File, Content } from 'jostraca'


// The text shape of each generated output lives in a jostraca-style
// fragment file with $$slot$$ placeholders. Fragments ship with this
// package under tm/lambda/, and a project can shadow any of them by
// placing a same-named file in its own tm folder (passed as spec.tm by
// the project's build actions). The fragment file's final newline is
// dropped at load, so slot values fully control trailing bytes.

// Package tm folder: compiled code lives at <pkg>/dist/env/lambda (three
// levels down), but test transforms run the source at <pkg>/env/lambda
// (two levels down) - probe both.
const PKG_TM = [
  Path.join(__dirname, '..', '..', '..', 'tm', 'lambda'),
  Path.join(__dirname, '..', '..', 'tm', 'lambda'),
].find((p) => Fs.existsSync(p)) ||
  Path.join(__dirname, '..', '..', '..', 'tm', 'lambda')


function loadFragment(name: string, spec?: { tm?: string }): string {
  const candidates = []
  if (spec?.tm) {
    candidates.push(Path.join(spec.tm, name))
  }
  candidates.push(Path.join(PKG_TM, name))

  for (const c of candidates) {
    if (Fs.existsSync(c)) {
      let src = Fs.readFileSync(c, 'utf8')
      if (src.endsWith('\n')) {
        src = src.substring(0, src.length - 1)
      }
      return src
    }
  }
  throw new Error('@voxgig/build: fragment not found: ' + name +
    ' (looked in ' + candidates.join(', ') + ')')
}


// Literal $$slot$$ substitution (split/join - values are never
// interpreted, so ${...}, $&, etc. pass through untouched).
function renderFragment(src: string, slots: Record<string, any>): string {
  let out = src
  for (const key of Object.keys(slots)) {
    out = out.split('$$' + key + '$$').join(String(slots[key]))
  }
  return out
}


// Fragment names shipped by this package (for tooling: list/eject).
function listFragments(): string[] {
  return Fs.readdirSync(PKG_TM).filter((f) => f.endsWith('.frag')).sort()
}


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
  loadFragment,
  renderFragment,
  listFragments,
  PKG_TM,
}
