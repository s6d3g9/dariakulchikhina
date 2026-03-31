const authUserId = 'alice'
function handle(e) {
  return e.speaker === 'you' ? 'peer' : (e.speaker === 'peer' ? 'you' : (e.speaker === authUserId ? 'you' : 'peer'))
}
console.log(handle({speaker: 'you'})) // peer
console.log(handle({speaker: 'peer'})) // you
console.log(handle({speaker: 'alice'})) // you
console.log(handle({speaker: 'bob'})) // peer
