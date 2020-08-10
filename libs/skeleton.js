const $step = document.getElementById('step')
const $type = document.getElementById('type')
const $shimmer = document.getElementById('shimmer')
const $colorControls = Array.from(document.querySelectorAll('.colors'))

let type = $type.value
let step = parseFloat($step.value)
let isShimmer = $shimmer.checked
let colors = $colorControls.map(d => d.value || '#000000').concat($colorControls[0].value).map(d => toRGB(d))
let offset = 0
let delayFrame = 0

$type.addEventListener('change', e => {
    type = e.target.value
})
$step.addEventListener('keydown', e => {
    step = Number(e.target.value) || 20
})
$shimmer.addEventListener('change', e => {
    isShimmer = e.target.checked
})
$colorControls.forEach((el, i) => {
  el.addEventListener('input', e => {
      colors[i] = toRGB(e.target.value)
      if (i === 0) {
          colors[colors.length - 1] = colors[0]
      }
  })
})

function toRGB (color) {
    const s = color.substring(1, 7)
    const r = []
    for (let i = 0; i < s.length; i +=2){
        r.push(parseInt(s.substr(i, 2), 16))
    }
    return r.join(',')
}


function skeleton (canvas, data) {
    const ctx = canvas.getContext('2d')
    const layers1 = data.filter(d => d.shimmer !== true)
    const layers2 = data.filter(d => d.shimmer === true)
    const sc = shadowCanvas(canvas, layers2)
    data = normalizeData(data)

    function render () {
        delayFrame++
        ctx.save()
        ctx.fillStyle = '#f8f8f8'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const layers = isShimmer ? layers1 : data
        layers.forEach((d, i) => {
            rounded(ctx, d.x, d.y, d.width, d.height, d.radius)
            ctx.fillStyle = getRGBA(d, i)
            ctx.fill()
        })

        if (isShimmer) {
            sc.render()
            ctx.drawImage(sc.canvas, 0, 0, canvas.width, canvas.height)
        }
        ctx.restore()
        requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
}

function shadowCanvas (canvas, data) {
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = canvas.width
    shadowCanvas.height = canvas.height
    shadowCanvas.style.cssText = 'display:none'

    const ctx = shadowCanvas.getContext('2d')

    function render () {
        ctx.save()
        ctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height)
        data.forEach(d => {
            rounded(ctx, d.x, d.y, d.width, d.height, d.radius)
            ctx.fillStyle = d.color
            ctx.fill()
        })

        ctx.globalCompositeOperation = type

        if (offset > 1000) {
            offset = -1000
        }
        const gradient = ctx.createLinearGradient(offset, offset, offset + canvas.width, offset + canvas.height)
        gradient.addColorStop(0, `rgba(${colors[0]}, .01`)
        for (let i = 1; i < colors.length; i++) {
            const alpha = Math.sin(Math.PI / colors.length * i) * 0.05 + 0.05
            gradient.addColorStop(parseFloat((i/colors.length).toFixed(1)), `rgba(${colors[i]}, ${alpha})`)
        }
        gradient.addColorStop(1, `rgba(${colors[colors.length - 1]}, .01`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        offset += step

        ctx.restore()
    }

    return {
        canvas: shadowCanvas,
        render
    }
}

function normalizeData (data) {
    return data.map((d, i) => {
        if (d.color) {
            d.rgb = toRGB(d.color)
        }
        if (d.color.length === 9) {
            d.a = parseInt(d.color.substr(7, 2), 16) / 255
        } else {
            d.a = 1
        }
        d.alphaDelay = i * 2
        d.alphaFrame = 100
        return d
    })
}

function getRGBA(layer, i) {
    let a = delayFrame < layer.alphaDelay ? 0 : layer.a * (1 / layer.alphaFrame)
    if (a < layer.a) {
        layer.alphaFrame--
    } else {
        a = layer.a
    }
    return `rgba(${layer.rgb}, ${a})`
}

function rounded (ctx, x, y, w, h, r) {
    if ( w < 2 * r) r = w / 2
    if (h < 2 * r) r = h / 2
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y , r)
    ctx.arcTo(x, y, x + w, y , r)
    ctx.closePath()
}
