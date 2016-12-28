"use strict";
var bbPromise = require('bluebird')
var assert = require('assert')

describe('BlueBird',function(){
  it('#finally',done=>{
    var counter = 0
    bbPromise.resolve().then(()=>{
      return 77
    })
    .finally(()=>{
      ++counter
      return 99
    })
    .then(r=>{
      assert.equal(r, 77)
      throw 66
    })
    .finally(()=>{
      ++counter
    })
    .catch(e=>{
      assert.equal(e, 66)
      return 988
    })
    .finally(()=>{
      ++counter
    })
    .then(r=>{
      assert.equal(r, 988)
      assert.equal(counter, 3)
    })
    .then(()=>{
      return bbPromise.promisify(function(callback){
        setTimeout(()=>callback(99), 10)
      })()
    })
    .finally(()=>{
      ++counter
    })
    .catch(r=>{
      assert.equal(r.message, 99)
      assert.equal(counter, 4)
      return 
    })
    .then(done).catch(done)
  })

  it('in-porcess-all',function(){
    bbPromise.resolve(22)
    .then(function(r){
      assert.equal(r, 22)
      return [
        bbPromise.resolve(33),
        bbPromise.resolve(34),
        bbPromise.resolve(35)
      ]
    })
    .all()
    .then(function(r){
      assert.equal(r.length, 3)
      return r
    })
    .spread(function(t0, t1, t2){
      assert.equal(t0, 33)
      assert.equal(t1, 34)
      assert.equal(t2, 35)
    })
  })

  it('join',function(){
    var t0 = bbPromise.resolve(33)
    var t1 = bbPromise.resolve(34)
    var t2 = bbPromise.resolve(35)
    bbPromise.join(t0, t1, t2)
    .spread(function(t0, t1, t2){
        assert.equal(t0, 33)
        assert.equal(t1, 34)
        assert.equal(t2, 35)
    })
  })

/* does not work
  it('#map',function(done){
    bbPromise.map({a:0, b:1, c:2},function(value, key){
      console.log(key, value)
    }).then(done).catch(done)
  })
*/

  it('catch-continue',function(done){
    var t0 = new bbPromise(function(resolve, reject){
      resolve(33)
    })
    .then(function(){
      return 22
    })
    .then(function(){
      throw new Error(33)
    })

    var t1 = t0.catch(function(){
      //console.log(t0)
      return 64
    })

    t1.then(function(r){
      //console.log('22222',t1)
      assert.equal(r, 64)
    })
  	.then(function(){
      done()
    })
    .catch(done)
  })
})
