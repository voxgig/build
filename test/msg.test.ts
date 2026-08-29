/* Copyright © 2026 Voxgig Ltd, MIT License */

// The message declaration readers (util.ts). main.msg has two shapes and
// everything that walks messages goes through these:
//
//   declared      main: msg: [ { pat: [ {aim: web}, {save: item} ] } ]
//   legacy chain  aim: web: { save: item: { '$': { file: './web_save_item' } } }
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


  test('msgentries reads a declared list', () => {
    assert.deepEqual(
      msgentries([{ pat: [{ aim: 'web' }, { save: 'item' }] }]),
      [[['aim', 'web', 'save', 'item'], {}]])

    // meta is the definition without its pattern.
    assert.deepEqual(
      msgentries([{
        pat: [{ aim: 'web' }, { save: 'item' }],
        doc: 'Save an item',
        file: './custom',
      }]),
      [[['aim', 'web', 'save', 'item'], { doc: 'Save an item', file: './custom' }]])

    // THE REASON THE SHAPE IS A LIST: a gateway proxy and the message it
    // forwards to share their last pattern pair, so a map keyed by message
    // name could not hold both.
    assert.deepEqual(
      msgentries([
        { pat: [{ aim: 'todo' }, { save: 'item' }] },
        { pat: [{ aim: 'web' }, { on: 'todo' }, { save: 'item' }], file: './web_save_item' },
      ]),
      [
        [['aim', 'todo', 'save', 'item'], {}],
        [['aim', 'web', 'on', 'todo', 'save', 'item'], { file: './web_save_item' }],
      ])

    assert.deepEqual(msgentries([]), [])

    // Elements that are not definitions are skipped rather than thrown on.
    assert.deepEqual(
      msgentries([null, 'nope', {}, { pat: [{ a: 'b' }] }]),
      [[['a', 'b'], {}]])

    // Malformed pairs are dropped. A pair holding two keys is dropped whole:
    // guessing which was meant would silently produce a pattern nobody
    // declared.
    assert.deepEqual(
      msgentries([{ pat: [{ a: 'b' }, 'nope', null, [], { c: 'd', e: 'f' }] }]),
      [[['a', 'b'], {}]])
  })


  test('aimmsgs selects by pattern, not by tree position', () => {
    const chain = { aim: { thing: { get: { info: {} } }, other: { list: { all: {} } } } }
    assert.deepEqual(aimmsgs(chain, 'thing'), [[['get', 'info'], {}]])
    assert.deepEqual(aimmsgs(chain, 'other'), [[['list', 'all'], {}]])

    // A declared definition is an element of main.msg, not a node under
    // main.msg.aim, so position-based lookup would miss it entirely.
    const declared = [{ pat: [{ aim: 'thing' }, { get: 'info' }] }]
    assert.deepEqual(aimmsgs(declared, 'thing'), [[['get', 'info'], {}]])

    // A service with no messages yields nothing rather than throwing.
    assert.deepEqual(aimmsgs(chain, 'absent'), [])
    assert.deepEqual(aimmsgs({}, 'thing'), [])
    assert.deepEqual(aimmsgs([], 'thing'), [])
  })


  test('msgindex keys metadata by pattern path', () => {
    const fromChain = msgindex({
      aim: { thing: { save: { item: { $: { transport: { queue: { active: true } } } } } } },
    })
    assert.deepEqual(fromChain['aim,thing,save,item'],
      { transport: { queue: { active: true } } })
    assert.strictEqual(fromChain['aim,thing,absent,msg'], undefined)

    const fromList = msgindex([
      { pat: [{ aim: 'thing' }, { get: 'info' }], doc: 'Info' },
    ])
    assert.deepEqual(fromList['aim,thing,get,info'], { doc: 'Info' })
  })

})
