import ee from 'event-emitter'
var emitter = ee({})

const whichAnimationEvent = () => {
  let el = document.createElement('fakeelement')
  let animations = {
    'animation'       : 'animationend',
    'OAnimation'      : 'oAnimationEnd',
    'MozAnimation'    : 'animationend',
    'WebkitAnimation' : 'webkitAnimationEnd'
  }

  for (let t in animations){
    if (el.style[t] !== undefined){
      return animations[t]
    }
  }
}

const animationEvent = whichAnimationEvent()
const defaults = {
  finish : null,
  until  : null,
  target : null
}

class Ensure {
  constructor(el, options = {}) {
    this.el = el
    this.props = Object.assign({}, defaults, options)
    this.setup()
    this.reset()
    this.check()
  }

  setup() {
    let p  = this.props
    let finish  = p.finish ? p.finish : (this.el.getAttribute('data-ensure-finish-class') ? this.el.getAttribute('data-ensure-finish-class') : 'ensure-target-finished')
    let target  = p.target ? p.target : (this.el.getAttribute('data-ensure-target') ? document.querySelectorAll(this.el.getAttribute('data-ensure-target'))[0] : this.el)
    let until = p.until  ? p.until  : (this.el.getAttribute('data-ensure-until') ? this.el.getAttribute('data-ensure-until') : 'ensure-animation-loaded')

    this.state = {
      finish,
      target,
      until,
    }
  }

  reset() {
    this.iterations = 1
    this.shouldRun  = true
    this.isFinished = false
    this.isEmitted  = false
    this.el.style.animationIterationCount = 1
    this.checkReference = this.continueChecking.bind(this)
    this.el.removeEventListener(animationEvent, this.checkReference, false)
  }

  restart() {
    // Remove loaded classname
    let classList = this.el.classList
    let targetClassList = this.state.target.classList
    targetClassList.remove(this.state.until)

    // Force redraw
    let classes = classList.toString().split(' ')
    classList.remove(...classes)
    void this.el.offsetWidth
    classList.add(...classes)

    this.el.removeEventListener(animationEvent, this.checkReference, false)

    this.reset()
    this.check()
  }

  check() {
    this.el.addEventListener(animationEvent, this.checkReference, false)
  }

  finish() {
    return new Promise((resolve) => {
      this.shouldRun = false

      // Listen for finished
      if ( ! this.isEmitted) {
        this.isEmitted = true
        emitter.on('finished', resolve)
      }
    })
  }

  continueChecking() {
    // If it should run and not finished, keep checking for ending class
    let containsEndingClass = this.state.target.classList.contains(this.state.until)
    if (containsEndingClass) {
      this.stop()
      emitter.emit('finished')
    }

    if ( ! this.shouldRun) {
      this.isFinished = true

      if (this.state.finish) {
        this.state.target.classList.add(this.state.finish)
      }

      if (this.isFinished) {
        this.isFinished = false
        emitter.emit('finished')
      }

      return
    }

    this.iterations += 1
    this.el.style.animationIterationCount = this.iterations
  }

  stop() {
    this.shouldRun = false
    this.el.removeEventListener(animationEvent, this.checkReference, false)
  }
}

export default class EnsureAnimation {
  constructor(selector, options) {
    const animations = document.querySelectorAll(selector)
    let instances = []

    for (let i = 0; i < animations.length; i++) {
      instances.push(new Ensure(animations[i], options))
    }

    return instances
  }
}
