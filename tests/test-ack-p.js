"use strict";

var ackP = require('../ack-p'),
  bluebird = require('bluebird'),
  assert = require('assert')

//console.log('ackP',ackP)

//method used to ensure no memory back-and-forth references
var isCyclic = require('./isCyclic')




describe('ackP',function(){
  this.timeout(200)

  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  afterEach(function(){
    assert.equal(isCyclic(p),false)
    /*
    //ensure data from promise has been released
    if(p.data!=null){
      console.log(p.data)
      if(p.data.nextTask && p.data.nextTask.method){
        console.log('-----Expected memory to have been cleared')
        console.log(p.data.nextTask.method.toString())
      }
      throw new Error('p.data != null typeof(p.data)=='+typeof(p.data))
    }
    */
  })

  describe('promisify',function(){  
    it('success',function(done){
      var callback = function(a,b,callback){
        setTimeout(function(){
          callback(null,55)
        }, 10)
      }

      callback = ackP.promisify(callback)

      callback(1,2).then(function(res){
        assert.equal(res, 55)
      })
      .then(done).catch(done)
    })

    it('failure',function(done){
      var callback = function(a,b,callback){
        setTimeout(function(){
          callback(new Error('nope'))
        }, 10)
      }

      callback = ackP.promisify(callback)

      callback(1,2).then(function(res){
        assert.equal(res, 55)
      })
      .catch('nope',function(err){
        assert.equal(err.message, 'nope')
      })
      .then(done).catch(done)
    })
  })

  it('then-array',function(done){
    p.resolve(11,22,33)
    .then(function(a,b,c){
      assert.equal(a, 11)
      assert.equal(b, 22)
      assert.equal(c, 33)
      return [ackP.resolve(44), ackP.resolve(55), ackP.resolve(66)]
    })
    .map(function(x){return x})//array-of-promises to array-of-values
    .then(function(a){
      assert.equal(a.length, 3)
      assert.equal(a[0], 44)
      assert.equal(a[1], 55)
      assert.equal(a[2], 66)
    })
    .then(done).catch(done)
  })

  it('#reflect',function(done){
    p.resolve(11,22,33)
    .reflect(function(promise, a, b, c){
        assert.equal(promise.values.constructor, Array)
        assert.equal(promise.values[0], 11)
        assert.equal(promise.values[1], 22)
        assert.equal(promise.values[2], 33)
        assert.equal(a, 11)
        assert.equal(b, 22)
        assert.equal(c, 33)
    })
    .then(function(a,b,c){
      assert.equal(a, 11)
      assert.equal(b, 22)
      assert.equal(c, 33)
    })
    .resolve()
    .then(done).catch(done)
  })

  it('#thenPromise',function(done){
    var prom2 = ackP.start().callback(function(callback){
      setTimeout(callback, 20)
    }).set(55)

    p.then(prom2).then(function(a){
      assert.equal(a,55)
    })
    .then(done).catch(done)
  })

  describe('#catch', require('./test-catch'))

  //ensure no cyclic references
  it('isCyclic',function(){
    var t = new ackP(function(res,rej){
      res()
    })
    assert.equal(isCyclic(t),false)
    assert.equal(isCyclic(p),false)
    assert.equal(p.inpass==null,true)
  })

  it('constructor',function(done){
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
    .then(done).catch(done)
  })

  describe('Other-Libraries', require('./test-other-libraries'))

  describe('#call',function(done){
    it('#set',function(done){
      p.set({toString:function(){return 'spice'}})
      .call('toString')
      .then(function(result){
        if(result!='spice')new Error('expected spice')
      })
      .then(done).catch(done)
    })

    it('#then',function(done){
      p.then(function(){
        return {ace:function(r){
          return r
        }}
      })
      .call('ace',22)
      .then(function(result){
        assert.equal(result, 22)
      })
      .then(done).catch(done)
    })
  })

  describe('#method',function(){
    it('starts',function(done){
      var m = ackP.method(function(one, two, three){
        assert.equal(one, 1)
        assert.equal(two, 2)
        assert.equal(three, 3)
      })

      m(1,2,3).then(done).catch(done)
    })

    it('start-catches',function(done){
      var m = ackP.method(function(one, two, three){
        throw new Error('method-error-test');
      })

      m(3,2,1).catch('method-error-test',function(){done()})
    })

    it('runs',function(done){
      ackP.start().then(function(){
        return 33
      })
      .method(function(thirtyThree){
        assert.equal(thirtyThree, 33)
      })
      .then(done).catch(done)
    })
  })

  describe('#bind', require('./test-bind'))

  it('#bindResult',function(done){
    p.set(34).then(function(){
      return {my:'hello', name:'world'}
    })
    .bindResult()
    .then(function(result){
      assert.equal(result.my, 'hello')
      assert.equal(result.name, 'world')
      assert.equal(this.my, 'hello')
      assert.equal(this.name, 'world')
    })
    .then(done).catch(done)
  })

  it('#bindCall',function(done){
    p.set(34).then(function(){
      return {
        my:'hello', name:'world'
        ,test0:function(r){return r}, test1:function(){return 'hello world'}
      }
    })
    .bindResult()
    .bindCall('test0')
    .bindCall('test1')
    .then(function(result){
      assert.equal(result, 'hello world')
      assert.equal(this.my, 'hello')
      assert.equal(this.name, 'world')
    })
    .then(done).catch(done)
  })

  describe('#next', require('./test-next'))

  it('#set',function(done){
    p.set(1,2,3)
    .then(function(a,b,c){
      if(a!=1 || b!=2 || c!=3)throw new Error('set did not work correctly');
    })
    .set([2.3,4])
    .then(function(a){
      assert(a.constructor,Array)
      assert(a.length,3)
    })
    .set([2,3,4])
    .spread(function(a,b,c){
      assert.equal(a,2)
      assert.equal(b,3)
      assert.equal(c,4)
      assert.equal(isCyclic(p),false)
    })
    .then(done).catch(done)
  })

  describe('#get',function(){
    it('object',function(done){
      p.set({a:1,b:2,c:3})
      .get('c')
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('array',function(done){
      p.set(['a','b','c'])
      .get(2)
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('negative-array',function(done){
      p.set(['a','b','c'])
      .get(-1)
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })

    it('sub-object',function(done){
      p.set({a:1,b:2,c:{sub:3}})
      .get('c','sub')
      .then(function(c){
        assert(c,3)
      })
      .then(done).catch(done)
    })
  })

  describe('#delay',function(){
    it('then-delay',function(done){
      p.then(function(){
        return 7869
      })
      .delay(20)
      .then(function(r){
        if(r!=7869)throw new Error('expected 7869')
      })
      .then(done).catch(done)
    })

    it('delay',function(done){
      var xx=0
      setTimeout(function(){
        xx=22
      }, 20)

      p.delay(30)
      .then(function(r){
        assert.equal(xx, 22)
      })
      .then(done).catch(done)
    })
  })

  describe('#spread', require('./test-spread'))

  it('#past',function(done){
    p.then(function(){
      return 22
    })
    .past(function(r){
      if(r!=22)throw '0.0 expected 22';
      return 77
    })
    .past(function(r){
      if(r!=22)throw '0.1 expected 22. Got '+r;
      return 88
    })
    .then(function(r){
      if(r!=22)throw '0.2 expected 22';
      return 99
    })
    .then(function(r){
      if(r!=99)throw '0.3 expected 99';
    })
    .then(done).catch(done)
  })

  describe('#pass', require('./test-pass'))

  describe('#join', require('./test-join'))

  describe('#all', require('./test-all'))

  describe('#map', require('./test-map'))

  describe('#each',function(){
    it('simple',function(done){
      var spot=0, orgArray = [1,2,3,4]

      p.set(orgArray)
      .each(function(v,i){
        assert.equal(i,spot)
        ++spot
      })
      .then(function(array){
        assert.equal(array[0], 1)
        assert.equal(array[3], 4)
        assert.equal(array, orgArray)
      })
      .then(done).catch(done)
    })

    it('async',function(done){
      var spot=0, orgArray = [1,2,3,4]

      p.set(orgArray).each(function(v,i){
        var delay = 20-i*2
        return ackP.start().delay(delay)
        .then(function(){
          assert.equal(i,spot)
          ++spot
          return true
        })
      })
      .then(function(array){
        assert.equal(array[0], 1)
        assert.equal(array[3], 4)
        assert.equal(array, orgArray)
      })
      .then(done).catch(done)
    })
  })

  describe('#callback', require('./test-callback'))

  describe('#if', require('./test-if'))
})