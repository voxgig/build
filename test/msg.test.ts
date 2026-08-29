/* Copyright © 2026 Voxgig Ltd, MIT License */

// The message declaration readers (util.ts). main.msg has two shapes and
// everything that walks messages goes through these:
//
//   legacy chain    aim: web: { save: item: { '$': { file: './web_save_item' } } }
//   declared        save_item: { pat: [ {aim: web}, {save: item} ] }
//
// msgentries is a drop-in for @voxgig/util's dive() over a message tree, so
// the chain cases below also pin the behaviour the generators relied on
// before.

import { describe, test } from 'node:test'
import assert from 'node:assert'

import { ismsgdef, msgentries, aimmsgs, msgindex } from '../util'


describe('msg', () => {

  test('ismsgdef discriminates on pat being a list', () => {
    assert.strictEqual(ismsgdef({ pat: [{ a: 'b' }] }), true)
    assert.strictEqual(ismsgdef({ pat: [] }), true)

    // A chain node's values are always maps, so a legacy pair spelled `pat:`
    // is still a chain node.
    assert.strictEqual(ismsgdef({ pat: { web: {} } }), false)

    assert.strictEqual(ismsgdef({}), false)
    assert.strictEqual(ismsgdef(null), false)
    assert.strictEqual(ismsgdef(undefined), false)
    assert.strictEqual(ismsgdef('nope'), false)
    assert.strictEqual(ismsgdef([{ pat: [] }]), false)
  })


  test('msgentries walks the legacy chain', () => {
    assert.deepEqual(
      msgentries({ aim: { thing: { get: { info: {} } } } }),
      [[['aim', 'thing', 'get', 'info'], {}]])

    // '$' contributes the metadata and does not appear in the path.
    assert.deepEqual(
      msgentries({ aim: { thing: { save: { item: { $: { file: './f' } } } } } }),
      [[['aim', 'thing', 'save', 'item'], { file: './f' }]])

    assert.deepEqual(msgentries({}), [])
    assert.deepEqual(msgentries(null), [])
  })


  test('msgentries reads declared definitions', () => {
    assert.deepEqual(
      msgentries({ save_item: { pat: [{ aim: 'web' }, { save: 'item' }] } }),
      [[['aim', 'web', 'save', 'item'], {}]])

    // meta is the definition without its pattern.
    assert.deepEqual(
      msgentries({
        save_item: {
          pat: [{ aim: 'web' }, { save: 'item' }],
          doc: 'Save an item',
          file: './custom',
        }
      }),
      [[['aim', 'web', 'save', 'item'], { doc: 'Save an item', file: './custom' }]])

    // Both shapes in one model.
    assert.deepEqual(
      msgentries({
        aim: { thing: { get: { info: {} } } },
        save_item: { pat: [{ aim: 'web' }, { save: 'item' }] },
      }),
      [
        [['aim', 'thing', 'get', 'info'], {}],
        [['aim', 'web', 'save', 'item'], {}],
      ])

    // Malformed pairs are dropped rather than thrown on. A pair holding two
    // keys is dropped whole: guessing which was meant would silently produce
    // a pattern nobody declared.
    assert.deepEqual(
      msgentries({ x: { pat: [{ a: 'b' }, 'nope', null, [], { c: 'd', e: 'f' }] } }),
      [[['a', 'b'], {}]])
  })


  test('aimmsgs selects by pattern, not by tree position', () => {
    const chain = { aim: { thing: { get: { info: {} } }, other: { list: { all: {} } } } }
    assert.deepEqual(aimmsgs(chain, 'thing'), [[['get', 'info'], {}]])
    assert.deepEqual(aimmsgs(chain, 'other'), [[['list', 'all'], {}]])

    // A declared definition lives at main.msg.<name>, never under main.msg.aim,
    // so position-based lookup would miss it entirely.
    const declared = { get_info: { pat: [{ aim: 'thing' }, { get: 'info' }] } }
    assert.deepEqual(aimmsgs(declared, 'thing'), [[['get', 'info'], {}]])

    // A service with no messages yields nothing rather than throwing.
    assert.deepEqual(aimmsgs(chain, 'absent'), [])
    assert.deepEqual(aimmsgs({}, 'thing'), [])
  })


  test('msgindex keys metadata by pattern path', () => {
    const index = msgindex({
      aim: { thing: { save: { item: { $: { transport: { queue: { active: true } } } } } } },
      get_info: { pat: [{ aim: 'thing' }, { get: 'info' }], doc: 'Info' },
    })

    assert.deepEqual(index['aim,thing,save,item'],
      { transport: { queue: { active: true } } })
    assert.deepEqual(index['aim,thing,get,info'], { doc: 'Info' })
    assert.strictEqual(index['aim,thing,absent,msg'], undefined)
  })

})
