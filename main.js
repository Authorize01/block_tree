import block from './src/treeV2.js'

let data = 'abcdfeg'.split('')
let root = block.root(data)
let pr = block.proof('b', data)
let vr = block.Buffer('hallo')
let bnv = block.RLP_encode(['erevereeyryeryeuetu','dfsdgs'])
console.log(vr,bnv)

