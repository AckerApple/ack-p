var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var p

  beforeEach(function(){
    p = ackP.resolve()
  })

  it('sync',function(done){
    var tester = 0

    p.then(function(){
      return 4224
    })
    .pass(function(r,next){
      assert.equal(r,4224,'first pass expected 4224')
      ++tester
      next(3773)
    })
    .pass(function(r,next){
      assert.equal(r,4224,'second pass expected 4224 - '+r)
      ++tester
      next(299)
    })
    .then(function(r){
      assert.equal(r,4224,'then expected 4224')
      assert.equal(tester, 2, 'expected 2 passes to run before I ran')
      return 99
    })
    .then(function(r){
      assert.equal(r,99, 'sync close expected 99')
    })
    .then(done).catch(done)
  })

  it('async',function(done){
    var tester = 0

    p.then(function(){
      return 2468
    })
    .pass(function(r,next){
      if(r!=2468)throw new Error('first pass expected 2468');
      setTimeout(function(){
        tester=tester*2
        next()
      }, 20)
    })
    .pass(function(r,next){
      if(r!=2468)throw new Error('second pass expected 2468. Got '+r);
      setTimeout(function(){
        tester=(tester+1)*2
        next()
      }, 10)
    })
    .pass(function(r,next){
      if(r!=2468)throw new Error('third pass expected 2468 - '+r);
      setTimeout(function(){
        tester=tester*2
        next()
      }, 10)
    })
    .then(function(r){
      if(r!=2468)throw new Error('then expected 2468. Got '+r);
      if(tester!=8)throw new Error('expected 3 passes to total 8 before I ran. Got '+tester);
      return 969
    })
    .then(function(r){
      if(r!=969)throw new Error('async close expected 969. Got '+r);
      if(tester!=8)throw new Error('expected 3 passes to total 8 before I quit. Got '+tester);
    })
    .then(done).catch(done)
  })

  it('mix-pass-past',function(done){
    var tester = 0

    p.then(function(){
      return 22
    })
    .past(function(r){
      if(r!=22)throw new Error('second pass expected 22 - '+r);
      ++tester
      return 44
    })
    .pass(function(r,next){
      if(r!=22)throw new Error('first pass expected 22');
      setTimeout(function(){
        ++tester
        next()
      }, 30)
    })
    .pass(function(r,next){
      if(r!=22)throw new Error('first pass expected 22');
      setTimeout(function(){
        ++tester
        next()
      }, 10)
    })
    .past(function(r){
      if(r!=22)throw new Error('second pass expected 22 - '+r)
      ++tester
      return 7899
    })
    .then(function(r){
      if(r!=22)throw new Error('then expected 22');
      if(tester!=4)throw new Error('expected 4 passes to run before I ran. Got '+tester)
      return 99
    })
    .then(function(r){
      if(tester!=4)throw new Error('expected 4 passes before i close, to run before I ran. Got '+tester)
      if(r!=99)throw new Error('close expected 99')
    })
    .then(done).catch(done)
  })

  it('#complex',function(done){
    var scope = {test:33}
    var writeFile = function(content){
      if(content!='some promise file content')throw new Error('expected some promise file content to start file writing. Got type '+typeof(content));
      if(this.test!=33)throw new Error('expected this.test==33');
      var promise = ackP.start().then(function(){
        return this
      },this)
      return promise
    }
    var paramDirs = function(content){
      if(content!='some promise file content')throw new Error('expected some promise file content to start dir paraming. Got type '+typeof(content));
      if(this.test!=33)throw new Error('expected this.test==33');
      var promise = ackP.start().then(function(){
        return this
      },this)
      return promise
    }

    p.next(function(next){
      setTimeout(function(){
        next('some promise file content')
      },5)
    })
    .pass(function(next){
      setTimeout(function(){
        next(1233)
      }, 10)
      this.testing=33
    })
    .past(paramDirs,scope)
    .then(function(content){
      if(content!='some promise file content')throw new Error('Expected some promise file content. Got type '+typeof(content))
      return content
    })
    .then(writeFile,scope)
    .then(function(File){
      if(File.test!=33)throw new Error('expected File.test==33');
    })
    .then(function(){
      if(arguments.length!=0)throw new Error('Expected no arguments. Got '+arguments.length)
    })
    .then(done).catch(done)
  })
}