var ackP = require('../ack-p'),
  assert = require('assert')

module.exports = function(){
  var array
  var p

  beforeEach(function(){
    p = ackP.resolve()
    array = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
  })

  it('static',function(done){
    p.map(array,function(item,index,len){
      if(item!=array[index])throw new Error('array item mismatch');
      if(len!=array.length)throw new Error('array length mismatch');
      return item + 1
    })
    .then(function(newarray){
      if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
      if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
    })
    .then(done).catch(done)
  })

  it('binded',function(done){
    p.bind({ace:14})
    .map(array,function(item,index,len){
      assert.equal(this.ace, 14)
      if(item!=array[index])throw new Error('array item mismatch');
      if(len!=array.length)throw new Error('array length mismatch');
      return item + 1
    }).then(function(newarray){
      if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
      if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
    })
    .then(done).catch(done)
  })

  describe('object',function(){
    it('static',function(done){
      var staticob = {a:0,b:1,c:2,d:3,e:4}
      p.map(staticob,function(item,index,len){
        assert.equal(item, staticob[index])
        assert.equal(len, Object.keys(staticob).length)
        return item + 1
      }).then(function(newob){
        if(Object.keys(newob).length != Object.keys(staticob).length){
          throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
        }

        for(var x in newob){
          assert.equal(staticob[x]+1, newob[x])
        }
      })
      .then(done).catch(done)
    })

    it('static-empty',function(done){
      p.map({},function(item,index,len){
        throw new Error('should never have been called')
      })
      .set().then(done).catch(done)
    })

    it('static-none',function(done){
      p.map(function(item,index,len){
        throw new Error('should never have been called')
      })
      .then(done).catch(done)
    })
  })

  it('static-promise',function(done){
    p.map(array,function(item,index,len){
      if(item!=array[index])throw new Error('array item mismatch');
      if(len!=array.length)throw new Error('array length mismatch');
      return ackP.start().then(function(){
        return item + 1
      })
    })
    .then(function(newarray){
      if(newarray.length != array.length)throw new Error('0.0 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
      if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
    })
    .then(done).catch(done)
  })

  it('concurrency',function(done){
    p.map(array,function(item,index,len){
      if(item!=array[index]){
        console.log(11)
        throw new Error('array item mismatch');
      }
      
      if(len!=array.length){
        console.log(22)
        throw new Error('array length mismatch');
      }

      return ackP.start().next(function(next){
        setTimeout(function(){
          next(item + 1)
        }, 10)
      })
    },{concurrency:5})
    .then(function(newarray){
      if(newarray.length != array.length){
        console.log(33)
        throw new Error('0.1 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
      }
      
      if(newarray[0] != array[0]+1){
        console.log(44)
        throw new Error('newarray 0 incorrect');
      }
    })
    .then(done).catch(done)
  })

  it('concurrency-promise',function(done){
    p.then(function(){
      return array
    })
    .map(function(item,index,len){
      if(len!=array.length)throw new Error('array length mismatch');
      if(item!=array[index])throw new Error('array item mismatch');

      return ackP.start().next(function(next){
        setTimeout(function(){
          next()
        }, 5)
      })
      .pass(function(next){
        setTimeout(function(){
          next(89)
        }, 10)
      })
      .then(function(){
        return item + 1
      })
    },{concurrency:5})
    .then(function(newarray){
      if(newarray.length != array.length)throw new Error('0.1 newarray length mismatch. Expected '+array.length+'. Got '+newarray.length)
      if(newarray[0] != array[0]+1)throw new Error('newarray 0 incorrect');
    })
    .then(done).catch(done)
  })

  it('iteration-error',function(done){
    p.map(array,function(item,index,len){
      if(index==2){
        throw 'mid-iteration-error';
      }
    })
    .then(function(newarray){
      throw new Error('i should not be running');
    })
    .catch('mid-iteration-error',function(){
      done()
    }).catch(done)
  })

  it('iteration-sub-error',function(done){
    p.map(array,function(item,index,len){
      if(index==2){
        return ackP.start().callback(function(callback){
          setTimeout(function(){
            var e = new Error('mid-iteration-error')
            e.name = 'mid-iteration-error'
            callback(e)
          }, 30)
        })
      }
    })
    .then(function(newarray){
      throw 'i should not be running';
    })
    .catch('mid-iteration-error',function(){
      done()
    }).catch(done)
  })
}