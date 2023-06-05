import block from './src/tree.js'

let data = 'abcdf'.split('').map(i=>block.sha32(i))
let node = block.tree(data)
let next = block.proof(data[data.length-1], node)
console.log(node,next)
