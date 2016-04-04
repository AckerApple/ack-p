# ack-p, the Acker way of implementing promises
Extra full featured Promise-like implementation, that works with and just like you wished other Promise libraries would.

This code library was originally one persons efforts to make async functionality cleaner and easier to achieve, back in the IE6 years. Now, this code has been matured into a Promise library specfically intended to stay competitive with [bluebird](http://bluebirdjs.com) but ackP is intended to do Promises with a different approach without the restrictions of the Promises/A+ spefication that [bluebird](http://bluebirdjs.com) adheres to.

## Differences From bluebird (as of 4/1/2016)
This project is absolutely fond of [bluebird](http://bluebirdjs.com) but it does differ for pratical reasons:

- ackP can spread arrays into argument-positions
```
  ackP.resolve(['a','b','c'])
  .spread()
  .then(function(a,b,c){
    assert(a,'a')
    assert(b,'b')
    assert(c,'c')
  })
```
- ackP will spread callback-arg-positions into argument-positions
```
  ackP.resolve('a')
  .callback(function(a, next){
    assert.equal(a, 'a')
    next(null, a,'b','c')
  })
  .then(function(a,b,c){
    assert(a,'a')
    assert(b,'b')
    assert(c,'c')
  })
```
- ackP does not automatically error by default if no catch is chained to a running promise. Instead, not catching promise errors works just like ECMA6 Promises.
- ackP has ackP.if(condition, thenable) <- This thenable, is only executed when the condition evaluates true
- ackP can catch errors by type-name -> ackP.catch('TypeError', thenable)

## bluebird Specific Features Not Yet Added
- .catchThrow
- .catchReturn ()
- .done (unsure if will be added)

## History
Acker originally created a function-chaining library that worked in all browsers, before Promises were publically standardized. As Promises became standardized, the original function-chaining library Acker created, was then massaged into something that resembled Promises. And then along came the library [bluebird](http://bluebirdjs.com), and ackP was born from the original function-chaining library to be competitive with bluebird.

Please Note:
At this time, the [bluebird](http://bluebirdjs.com) Promise library has far more contributors, far more community involvement, and is overall a more publically perfected Promise library than ackP. Their is room for improvement in both Promise libraries and always a benefit to doing things in different ways.