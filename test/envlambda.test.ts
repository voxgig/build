/* Copyright © 2026 Voxgig Ltd, MIT License */

// Byte-identity fixtures for the jostraca-based EnvLambda templates.
//
// test/fixture holds the exact output of the pre-jostraca (3.1.0) generator
// for test/richmodel.js — a model exercising every branch (sqs/s3/schedule
// events, cors props, httpApi v2, gen.custom override, custom kind skip,
// queue defs, dynamo tables, ts and js handler langs). The refactor must
// reproduce it byte for byte.

import Fs from 'fs'
import Os from 'os'
import Path from 'path'

import { EnvLambda } from '../build'

const model = require('./richmodel.js')


function read(p: string) {
  return Fs.readFileSync(p, 'utf8')
}

function fixture(rel: string) {
  return read(Path.join(__dirname, 'fixture', rel))
}


describe('envlambda-jostraca', () => {

  test('byte-identical-to-3.1.0', async () => {
    const out = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'vb-envlambda-'))
    const genTs = Path.join(out, 'rich-ts', 'gen')
    const handlerTs = Path.join(out, 'rich-ts', 'handler')
    const handlerJs = Path.join(out, 'rich-js', 'handler')

    await EnvLambda.srv_yml(model, { folder: genTs })
    await EnvLambda.srv_handler(model, {
      folder: handlerTs, start: 'lambda',
      env: { folder: '../../env/lambda' }, lang: 'ts',
    })
    await EnvLambda.srv_handler(model, {
      folder: handlerJs, start: 'lambda',
      env: { folder: '../../env/lambda' }, lang: 'js',
    })
    await EnvLambda.resources_yml(model, {
      folder: genTs, filename: 'res.yml', custom: null as any,
    })

    expect(read(Path.join(genTs, 'srv.yml'))).toEqual(fixture('rich-ts/srv.yml'))
    expect(read(Path.join(genTs, 'res.yml'))).toEqual(fixture('rich-ts/res.yml'))

    for (const name of ['alpha', 'beta', 'delta', 'gamma']) {
      expect(read(Path.join(handlerTs, name + '.ts')))
        .toEqual(fixture('rich-ts/' + name + '.ts.txt'))
      expect(read(Path.join(handlerJs, name + '.js')))
        .toEqual(fixture('rich-js/' + name + '.js.txt'))
    }

    // customkind (kind=custom) and nolambda (no env.lambda) are skipped.
    expect(Fs.existsSync(Path.join(handlerTs, 'customkind.ts'))).toEqual(false)
    expect(Fs.existsSync(Path.join(handlerTs, 'nolambda.ts'))).toEqual(false)
  })

})
