# ack-p, the Acker way of implementing promises
[![build status](https://travis-ci.org/AckerApple/ack-p.svg)](http://travis-ci.org/AckerApple/ack-p)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![NPM version](https://img.shields.io/npm/v/ack-p.svg?style=flat-square)](https://www.npmjs.com/package/ack-p)

Extra full featured Promise-like implementation, that works with and just like you wished other Promise libraries would.

Back in the Internet Explorer days, this code library was originally just one persons efforts to make async functionality cleaner and easier to implement. Now, this code has been matured into a Promise library specfically intended to stay competitive with [bluebird](http://bluebirdjs.com). Ack-p is intended to do Promises with a different approach without the restrictions of the Promises/A+ spefication that [bluebird](http://bluebirdjs.com) adheres to.

### Table of Contents
- [Create Your Own NEW Promise](#create-your-own-new-promise)
- [resolve](#resolve)
- [spread](#spread)
- [finally](#finally)
- [callback](#callback)
- [if](#if)
- [all](#all)
- [promisify](#promisify)
- [history](#history)

## Create Your Own NEW Promise

> Note: Constructing your own new promise, is only needed when an existing process-flow is async but is not a thenable

```javascript
var ackP = require('ackP')//if this is nodeJs, if browser, just include ack-p

new ackP(function(resolve,reject){
  setTimeout(function(){//arbitrary async timeout
    resolve('a','b','c')
  }, 10)
})
.then(function(a,b,c){
  assert(a,'a')
  assert(b,'b')
  assert(c,'c')
})
```

## resolve
Resolve Position-Values into Argument-Positions

> Note: Other promise libraries that "chain" into ackP, will only receive the first argument

```javascript
ackP.resolve('a','b','c')
.then(function(a,b,c){
  assert(a,'a')
  assert(b,'b')
  assert(c,'c')
})
```


## spread
Spread Arrays into Argument-Positions

> Note: Other promise libraries that "chain" into ackP, will only receive the first argument

```javascript
ackP.resolve(['a','b','c'])
.spread()
.then(function(a,b,c){
  assert(a,'a')
  assert(b,'b')
  assert(c,'c')
})
```

## finally
An always run process regardless of error. Receives no input, output is ignored.

```javascript
const loading = 1

ackP.then(()=>{
  throw 'some error'
})
.finally(()=>{
  --loading
})
.catch(e=>console.error(e))
```


## callback
Spread callback-argument-positions into argument-positions
```javascript
ackP.resolve('a')
.callback(function(a, callback){
  assert.equal(a, 'a')
  callback(null, a,'b','c')
})
.then(function(a,b,c){
  assert(a,'a')
  assert(b,'b')
  assert(c,'c')
})
```


## if
Conditional thenables

> Note: Older browsers may choke on using reserved word (alternatives available)

```javascript
ackP.resolve(22)
.if(33,function(){
  throw 'I wish I was 22'
})
.if(function(v){
  return v==68
},function(){
  throw 'I wish I was 68'
})
.if(22,function(){
  return [88,99];
})
.spread(function(a,b){
  assert.equal(a, 88)
  assert.equal(b, 99)
})
```


## all

- Kick start a Promise with an array of running promises
```javascript
ackP.all([
  ackP.resolve(1),
  ackP.resolve(2)
])
.then(function(a,b){
  assert(a,'1')
  assert(b,'2')
})
```

- Resolve a promise value that is an array of promises, into an array of values
```javascript
ackP.resolve(2)
.then(function(x){
  return [
    ackP.resolve(1),
    ackP.resolve(x)
  ]
})
.all()
.then(function(r){
  assert(r[0],'1')
  assert(r[1],'2')
})
```

## promisify
Promisify expects a function, where that function expects that it's last argument will be a callback. Returns wrapper of defined function, that when called, returns a promise of calling defined function

```javascript
function databaseCall(a,b,callback){
  setTimeout(function(){
    callback(null,55)
  }, 10)
}

var databasePromise = ackP.promisify(databaseCall)

databasePromise(1,2)
.then(function(res){
  assert.equal(res, 55)
})
```

## Differences From bluebird (as of 4/1/2016)
This project is absolutely fond of [bluebird](http://bluebirdjs.com) but it does differ for pratical reasons:

- ack-p does not automatically error by default if no catch is chained to a running promise. Instead, not catching promise errors works just like ECMA6 Promises.
- ack-p has ackP.if(condition, thenable) <- This thenable, is only executed when the condition evaluates true
- ack-p can catch errors by type-name -> ackP.catch('TypeError', thenable)

## bluebird Specific Features Not Yet Added
- .catchThrow
- .catchReturn ()
- .done (unsure if will be added)
- ... I'm sure bluebird has more that's been missed here (bluebird is great)

## History
Acker Apple originally created a function-chaining library that worked in all browsers, before Promises were publically standardized. As Promises became standardized, the original function-chaining library Acker created, was then massaged into something that resembled Promises. And then along came the library [bluebird](http://bluebirdjs.com), and ack-p was born from the original function-chaining library to be made to stay competitive with bluebird.

> Please Note:
>> At this time, the [bluebird](http://bluebirdjs.com) Promise library has far more contributors, far more community involvement, and is overall a more publically perfected Promise library than ack-p. Their is room for improvement in both Promise libraries and always a benefit to doing things in different ways.