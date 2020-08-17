/*
 * anime.js v3.2.0
 * (c) 2020 Julian Garnier
 * Released under the MIT license
 * animejs.com
 */

'use strict'

// Defaults

var defaultInstanceSettings = {
  update: null,
  begin: null,
  loopBegin: null,
  changeBegin: null,
  change: null,
  changeComplete: null,
  loopComplete: null,
  complete: null,
  loop: 1,
  direction: 'normal',
  autoplay: true
}

var defaultTweenSettings = {
  duration: 1000,
  delay: 0,
  endDelay: 0,
  easing: 'easeOutElastic(1, .5)',
  round: 0
}

// Caching

var cache = {
  CSS: {},
  springs: {}
}

// Utils

function minMax(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function stringContains(str, text) {
  return str.indexOf(text) > -1
}

function applyArguments(func, args) {
  return func.apply(null, args)
}

var is = {
  arr: function (a) {
    return Array.isArray(a)
  },
  obj: function (a) {
    return stringContains(Object.prototype.toString.call(a), 'Object')
  },
  str: function (a) {
    return typeof a === 'string'
  },
  fnc: function (a) {
    return typeof a === 'function'
  },
  und: function (a) {
    return typeof a === 'undefined'
  },
  key: function (a) {
    return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'
  }
}

// Easings

function parseEasingParameters(string) {
  var match = /\(([^)]+)\)/.exec(string)
  return match ? match[1].split(',').map(function (p) {
    return parseFloat(p)
  }) : []
}

// Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

function spring(string, duration) {

  var params = parseEasingParameters(string)
  var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100)
  var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100)
  var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100)
  var velocity = minMax(is.und(params[3]) ? 0 : params[3], .1, 100)
  var w0 = Math.sqrt(stiffness / mass)
  var zeta = damping / (2 * Math.sqrt(stiffness * mass))
  var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0
  var a = 1
  var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0

  function solver(t) {
    var progress = duration ? (duration * t) / 1000 : t
    if (zeta < 1) {
      progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress))
    } else {
      progress = (a + b * progress) * Math.exp(-progress * w0)
    }
    if (t === 0 || t === 1) {
      return t
    }
    return 1 - progress
  }

  function getDuration() {
    var cached = cache.springs[string]
    if (cached) {
      return cached
    }
    var frame = 1 / 6
    var elapsed = 0
    var rest = 0
    while (true) {
      elapsed += frame
      if (solver(elapsed) === 1) {
        rest++
        if (rest >= 16) {
          break
        }
      } else {
        rest = 0
      }
    }
    var duration = elapsed * frame * 1000
    cache.springs[string] = duration
    return duration
  }

  return duration ? solver : getDuration

}

// Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

function steps(steps) {
  if (steps === void 0) steps = 10

  return function (t) {
    return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps)
  }
}

// BezierEasing https://github.com/gre/bezier-easing

var bezier = (function () {

  var kSplineTableSize = 11
  var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0)

  function A(aA1, aA2) {
    return 1.0 - 3.0 * aA2 + 3.0 * aA1
  }

  function B(aA1, aA2) {
    return 3.0 * aA2 - 6.0 * aA1
  }

  function C(aA1) {
    return 3.0 * aA1
  }

  function calcBezier(aT, aA1, aA2) {
    return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT
  }

  function getSlope(aT, aA1, aA2) {
    return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1)
  }

  function binarySubdivide(aX, aA, aB, mX1, mX2) {
    var currentX, currentT, i = 0
    do {
      currentT = aA + (aB - aA) / 2.0
      currentX = calcBezier(currentT, mX1, mX2) - aX
      if (currentX > 0.0) {
        aB = currentT
      } else {
        aA = currentT
      }
    } while (Math.abs(currentX) > 0.0000001 && ++i < 10)
    return currentT
  }

  function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
    for (var i = 0; i < 4; ++i) {
      var currentSlope = getSlope(aGuessT, mX1, mX2)
      if (currentSlope === 0.0) {
        return aGuessT
      }
      var currentX = calcBezier(aGuessT, mX1, mX2) - aX
      aGuessT -= currentX / currentSlope
    }
    return aGuessT
  }

  function bezier(mX1, mY1, mX2, mY2) {

    if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
      return
    }
    var sampleValues = new Float32Array(kSplineTableSize)

    if (mX1 !== mY1 || mX2 !== mY2) {
      for (var i = 0; i < kSplineTableSize; ++i) {
        sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2)
      }
    }

    function getTForX(aX) {

      var intervalStart = 0
      var currentSample = 1
      var lastSample = kSplineTableSize - 1

      for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize
      }

      --currentSample

      var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample])
      var guessForT = intervalStart + dist * kSampleStepSize
      var initialSlope = getSlope(guessForT, mX1, mX2)

      if (initialSlope >= 0.001) {
        return newtonRaphsonIterate(aX, guessForT, mX1, mX2)
      } else if (initialSlope === 0.0) {
        return guessForT
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2)
      }

    }

    return function (x) {
      if (mX1 === mY1 && mX2 === mY2) {
        return x
      }
      if (x === 0 || x === 1) {
        return x
      }
      return calcBezier(getTForX(x), mY1, mY2)
    }

  }

  return bezier

})()

var penner = (function () {

  // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

  var eases = {
    linear: function () {
      return function (t) {
        return t
      }
    }
  }

  var functionEasings = {
    Sine: function () {
      return function (t) {
        return 1 - Math.cos(t * Math.PI / 2)
      }
    },
    Circ: function () {
      return function (t) {
        return 1 - Math.sqrt(1 - t * t)
      }
    },
    Back: function () {
      return function (t) {
        return t * t * (3 * t - 2)
      }
    },
    Bounce: function () {
      return function (t) {
        var pow2, b = 4
        while (t < ((pow2 = Math.pow(2, --b)) - 1) / 11) {
        }
        return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow((pow2 * 3 - 2) / 22 - t, 2)
      }
    },
    Elastic: function (amplitude, period) {
      if (amplitude === void 0) amplitude = 1
      if (period === void 0) period = .5

      var a = minMax(amplitude, 1, 10)
      var p = minMax(period, .1, 2)
      return function (t) {
        return (t === 0 || t === 1) ? t :
          -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p)
      }
    }
  }

  var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo']

  baseEasings.forEach(function (name, i) {
    functionEasings[name] = function () {
      return function (t) {
        return Math.pow(t, i + 2)
      }
    }
  })

  Object.keys(functionEasings).forEach(function (name) {
    var easeIn = functionEasings[name]
    eases['easeIn' + name] = easeIn
    eases['easeOut' + name] = function (a, b) {
      return function (t) {
        return 1 - easeIn(a, b)(1 - t)
      }
    }
    eases['easeInOut' + name] = function (a, b) {
      return function (t) {
        return t < 0.5 ? easeIn(a, b)(t * 2) / 2 :
          1 - easeIn(a, b)(t * -2 + 2) / 2
      }
    }
  })

  return eases

})()

function parseEasings(easing, duration) {
  if (is.fnc(easing)) {
    return easing
  }
  var name = easing.split('(')[0]
  var ease = penner[name]
  var args = parseEasingParameters(easing)
  switch (name) {
    case 'spring' :
      return spring(easing, duration)
    case 'cubicBezier' :
      return applyArguments(bezier, args)
    case 'steps' :
      return applyArguments(steps, args)
    default :
      return applyArguments(ease, args)
  }
}

// Objects
function cloneObject(o) {
  var clone = {}
  for (var p in o) {
    clone[p] = o[p]
  }
  return clone
}

function replaceObjectProps(o1, o2) {
  var o = cloneObject(o1)
  for (var p in o1) {
    o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]
  }
  return o
}

function mergeObjects(o1, o2) {
  var o = cloneObject(o1)
  for (var p in o2) {
    o[p] = is.und(o1[p]) ? o2[p] : o1[p]
  }
  return o
}

// Units

function getUnit(val) {
  var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val)
  if (split) {
    return split[1]
  }
}

// Values

function getFunctionValue(val, animatable) {
  if (!is.fnc(val)) {
    return val
  }
  return val(animatable.target, animatable.id, animatable.total)
}

function getOriginalTargetValue(target, propName) {
  return target[propName] || 0
}

function getRelativeValue(to, from) {
  var operator = /^(\*=|\+=|-=)/.exec(to)
  if (!operator) {
    return to
  }
  var u = getUnit(to) || 0
  var x = parseFloat(from)
  var y = parseFloat(to.replace(operator[0], ''))
  switch (operator[0][0]) {
    case '+':
      return x + y + u
    case '-':
      return x - y + u
    case '*':
      return x * y + u
  }
}

function validateValue(val, unit) {
  if (/\s/g.test(val)) {
    return val
  }
  var originalUnit = getUnit(val)
  var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val
  if (unit) {
    return unitLess + unit
  }
  return unitLess
}

// Decompose value

function decomposeValue(val, unit) {
  // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
  // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g // handles exponents notation
  var value = validateValue(val, unit) + ''
  return {
    original: value,
    numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
    strings: (is.str(val) || unit) ? value.split(rgx) : []
  }
}

// Animatables

function parseTargets(targets) {
  return targets.filter(function (item, pos, self) {
    return self.indexOf(item) === pos
  })
}

function getAnimatables(targets) {
  var parsed = parseTargets(targets)
  return parsed.map(function (t, i) {
    return {target: t, id: i, total: parsed.length, transforms: {list: []}}
  })
}

// Properties

function normalizePropertyTweens(prop, tweenSettings) {
  var settings = cloneObject(tweenSettings)
  // Override duration if easing is a spring
  if (/^spring/.test(settings.easing)) {
    settings.duration = spring(settings.easing)
  }
  if (is.arr(prop)) {
    var l = prop.length
    var isFromTo = (l === 2 && !is.obj(prop[0]))
    if (!isFromTo) {
      // Duration divided by the number of tweens
      if (!is.fnc(tweenSettings.duration)) {
        settings.duration = tweenSettings.duration / l
      }
    } else {
      // Transform [from, to] values shorthand to a valid tween value
      prop = {value: prop}
    }
  }
  var propArray = is.arr(prop) ? prop : [prop]
  return propArray.map(function (v, i) {
    var obj = is.obj(v) ? v : {value: v}
    // Default delay value should only be applied to the first tween
    if (is.und(obj.delay)) {
      obj.delay = !i ? tweenSettings.delay : 0
    }
    // Default endDelay value should only be applied to the last tween
    if (is.und(obj.endDelay)) {
      obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0
    }
    return obj
  }).map(function (k) {
    return mergeObjects(k, settings)
  })
}

function getProperties(tweenSettings, params) {
  var properties = []
  var keyframes = params.keyframes
  if (keyframes) {
    params = mergeObjects(keyframes.flat(), params)
  }
  for (var p in params) {
    if (is.key(p)) {
      properties.push({
        name: p,
        tweens: normalizePropertyTweens(params[p], tweenSettings)
      })
    }
  }
  return properties
}

// Tweens

function normalizeTweenValues(tween, animatable) {
  var t = {}
  for (var p in tween) {
    var value = getFunctionValue(tween[p], animatable)
    if (is.arr(value)) {
      value = value.map(function (v) {
        return getFunctionValue(v, animatable)
      })
      if (value.length === 1) {
        value = value[0]
      }
    }
    t[p] = value
  }
  t.duration = parseFloat(t.duration)
  t.delay = parseFloat(t.delay)
  return t
}

function normalizeTweens(prop, animatable) {
  var previousTween
  return prop.tweens.map(function (t) {
    var tween = normalizeTweenValues(t, animatable)
    var tweenValue = tween.value
    var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue
    var toUnit = getUnit(to)
    var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable)
    var previousValue = previousTween ? previousTween.to.original : originalValue
    var from = is.arr(tweenValue) ? tweenValue[0] : previousValue
    var fromUnit = getUnit(from) || getUnit(originalValue)
    var unit = toUnit || fromUnit
    if (is.und(to)) {
      to = previousValue
    }
    tween.from = decomposeValue(from, unit)
    tween.to = decomposeValue(getRelativeValue(to, from), unit)
    tween.start = previousTween ? previousTween.end : 0
    tween.end = tween.start + tween.delay + tween.duration + tween.endDelay
    tween.easing = parseEasings(tween.easing, tween.duration)
    previousTween = tween
    return tween
  })
}

// Tween progress

var setProgressValue = {
  object: function (t, p, v) {
    return t[p] = v
  },
}

// Set Value helper

function setTargetsValue(targets, properties) {
  var animatables = getAnimatables(targets)
  animatables.forEach(function (animatable) {
    for (var property in properties) {
      var value = getFunctionValue(properties[property], animatable)
      var target = animatable.target
      var valueUnit = getUnit(value)
      var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable)
      var unit = valueUnit || getUnit(originalValue)
      var to = getRelativeValue(validateValue(value, unit), originalValue)

      setProgressValue['object'](target, 'object', to, animatable.transforms, true)
    }
  })
}

// Animations

function createAnimation(animatable, prop) {
  var tweens = normalizeTweens(prop, animatable)
  var lastTween = tweens[tweens.length - 1]
  return {
    type: 'object',
    property: prop.name,
    animatable: animatable,
    tweens: tweens,
    duration: lastTween.end,
    delay: tweens[0].delay,
    endDelay: lastTween.endDelay
  }
}

function getAnimations(animatables, properties) {
  return animatables.map(animatable => {
    return properties.map(prop => {
      return createAnimation(animatable, prop)
    })
  }).flat().filter(a => !is.und(a))
}

// Create Instance

function getInstanceTimings(animations, tweenSettings) {
  var animLength = animations.length
  var getTlOffset = function (anim) {
    return anim.timelineOffset ? anim.timelineOffset : 0
  }
  var timings = {}
  timings.duration = animLength ? Math.max.apply(Math, animations.map(function (anim) {
    return getTlOffset(anim) + anim.duration
  })) : tweenSettings.duration
  timings.delay = animLength ? Math.min.apply(Math, animations.map(function (anim) {
    return getTlOffset(anim) + anim.delay
  })) : tweenSettings.delay
  timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map(function (anim) {
    return getTlOffset(anim) + anim.duration - anim.endDelay
  })) : tweenSettings.endDelay
  return timings
}

var instanceID = 0

function createNewInstance(params) {
  var instanceSettings = replaceObjectProps(defaultInstanceSettings, params)
  var tweenSettings = replaceObjectProps(defaultTweenSettings, params)
  var properties = getProperties(tweenSettings, params)
  var animatables = getAnimatables(params.targets)
  var animations = getAnimations(animatables, properties)
  var timings = getInstanceTimings(animations, tweenSettings)
  var id = instanceID
  instanceID++
  return mergeObjects(instanceSettings, {
    id: id,
    children: [],
    animatables: animatables,
    animations: animations,
    duration: timings.duration,
    delay: timings.delay,
    endDelay: timings.endDelay
  })
}

// Core

var activeInstances = []
var raf

var engine = (function () {
  function play() {
    raf = requestAnimationFrame(step)
  }

  function step(t) {
    var activeInstancesLength = activeInstances.length
    if (activeInstancesLength) {
      var i = 0
      while (i < activeInstancesLength) {
        var activeInstance = activeInstances[i]
        if (!activeInstance.paused) {
          activeInstance.tick(t)
        } else {
          var instanceIndex = activeInstances.indexOf(activeInstance)
          if (instanceIndex > -1) {
            activeInstances.splice(instanceIndex, 1)
            activeInstancesLength = activeInstances.length
          }
        }
        i++
      }
      play()
    } else {
      raf = cancelAnimationFrame(raf)
    }
  }

  return play
})()

// Public Instance

function anime(params) {
  if (params === void 0) params = {}

  var startTime = 0, lastTime = 0, now = 0
  var instance = createNewInstance(params)

  function toggleInstanceDirection() {
    var direction = instance.direction
    if (direction !== 'alternate') {
      instance.direction = direction !== 'normal' ? 'normal' : 'reverse'
    }
    instance.reversed = !instance.reversed
  }

  function adjustTime(time) {
    return instance.reversed ? instance.duration - time : time
  }

  function resetTime() {
    startTime = 0
    lastTime = adjustTime(instance.currentTime) * (1 / anime.speed)
  }

  function setAnimationsProgress(insTime) {
    var i = 0
    var animations = instance.animations
    var animationsLength = animations.length
    while (i < animationsLength) {
      var anim = animations[i]
      var animatable = anim.animatable
      var tweens = anim.tweens
      var tweenLength = tweens.length - 1
      var tween = tweens[tweenLength]
      // Only check for keyframes if there is more than one tween
      if (tweenLength) {
        tween = tweens.filter(t => insTime < t.end)[0] || tween
      }
      var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration
      var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed)
      var strings = tween.to.strings
      var round = tween.round
      var numbers = []
      var toNumbersLength = tween.to.numbers.length
      var progress = (void 0)
      for (var n = 0; n < toNumbersLength; n++) {
        var value = (void 0)
        var toNumber = tween.to.numbers[n]
        var fromNumber = tween.from.numbers[n] || 0
        if (!tween.isPath) {
          value = fromNumber + (eased * (toNumber - fromNumber))
        }
        if (round) {
          if (n <= 2) {
            value = Math.round(value * round) / round
          }
        }
        numbers.push(value)
      }
      // Manual Array.reduce for better performances
      var stringsLength = strings.length
      if (!stringsLength) {
        progress = numbers[0]
      } else {
        progress = strings[0]
        for (var s = 0; s < stringsLength; s++) {
          var b = strings[s + 1]
          var n$1 = numbers[s]
          if (!isNaN(n$1)) {
            if (!b) {
              progress += n$1 + ' '
            } else {
              progress += n$1 + b
            }
          }
        }
      }
      setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms)
      anim.currentValue = progress
      i++
    }
  }

  function setCallback(cb) {
    if (instance[cb] && !instance.passThrough) {
      instance[cb](instance)
    }
  }

  function countIteration() {
    if (instance.remaining && instance.remaining !== true) {
      instance.remaining--
    }
  }

  function setInstanceProgress(engineTime) {
    var insDuration = instance.duration
    var insDelay = instance.delay
    var insEndDelay = insDuration - instance.endDelay
    var insTime = adjustTime(engineTime)
    instance.progress = minMax((insTime / insDuration) * 100, 0, 100)
    instance.reversePlayback = insTime < instance.currentTime
    if (!instance.began && instance.currentTime > 0) {
      instance.began = true
      setCallback('begin')
    }
    if (!instance.loopBegan && instance.currentTime > 0) {
      instance.loopBegan = true
      setCallback('loopBegin')
    }
    if (insTime <= insDelay && instance.currentTime !== 0) {
      setAnimationsProgress(0)
    }
    if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
      setAnimationsProgress(insDuration)
    }
    if (insTime > insDelay && insTime < insEndDelay) {
      if (!instance.changeBegan) {
        instance.changeBegan = true
        instance.changeCompleted = false
        setCallback('changeBegin')
      }
      setCallback('change')
      setAnimationsProgress(insTime)
    } else {
      if (instance.changeBegan) {
        instance.changeCompleted = true
        instance.changeBegan = false
        setCallback('changeComplete')
      }
    }
    instance.currentTime = minMax(insTime, 0, insDuration)
    if (instance.began) {
      setCallback('update')
    }
    if (engineTime >= insDuration) {
      lastTime = 0
      countIteration()
      if (!instance.remaining) {
        instance.paused = true
        if (!instance.completed) {
          instance.completed = true
          setCallback('loopComplete')
          setCallback('complete')
        }
      } else {
        startTime = now
        setCallback('loopComplete')
        instance.loopBegan = false
        if (instance.direction === 'alternate') {
          toggleInstanceDirection()
        }
      }
    }
  }

  instance.reset = function () {
    var direction = instance.direction
    instance.passThrough = false
    instance.currentTime = 0
    instance.progress = 0
    instance.paused = true
    instance.began = false
    instance.loopBegan = false
    instance.changeBegan = false
    instance.completed = false
    instance.changeCompleted = false
    instance.remaining = instance.loop
    if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) {
      instance.remaining++
    }
    setAnimationsProgress(instance.reversed ? instance.duration : 0)
  }

  // Set Value helper

  instance.set = function (targets, properties) {
    setTargetsValue(targets, properties)
    return instance
  }

  instance.tick = function (t) {
    now = t
    if (!startTime) {
      startTime = now
    }
    setInstanceProgress((now + (lastTime - startTime)) * anime.speed)
  }

  instance.seek = function (time) {
    setInstanceProgress(adjustTime(time))
  }

  instance.play = function () {
    if (!instance.paused) {
      return
    }
    if (instance.completed) {
      instance.reset()
    }
    instance.paused = false
    activeInstances.push(instance)
    resetTime()
    if (!raf) {
      engine()
    }
  }

  instance.reset()

  if (instance.autoplay) {
    instance.play()
  }

  return instance

}


// Stagger helpers

function stagger(val, params) {
  if (params === void 0) params = {}

  var easing = params.easing ? parseEasings(params.easing) : null
  var fromIndex = params.from || 0
  var fromFirst = fromIndex === 'first'
  var isRange = is.arr(val)
  var val1 = isRange ? parseFloat(val[0]) : parseFloat(val)
  var val2 = isRange ? parseFloat(val[1]) : 0
  var unit = getUnit(isRange ? val[1] : val) || 0
  var start = params.start || 0 + (isRange ? val1 : 0)
  var values = []
  var maxValue = 0
  return function (el, i, t) {
    if (fromFirst) {
      fromIndex = 0
    }
    if (!values.length) {
      for (var index = 0; index < t; index++) {
        values.push(Math.abs(fromIndex - index))
        maxValue = Math.max.apply(Math, values)
      }
      if (easing) {
        values = values.map(function (val) {
          return easing(val / maxValue) * maxValue
        })
      }
    }
    var spacing = isRange ? (val2 - val1) / maxValue : val1
    return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit
  }
}

anime.speed = 1
anime.running = activeInstances
anime.stagger = stagger
anime.easing = parseEasings
anime.penner = penner
