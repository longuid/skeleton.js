
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

let type = 'color-burn'

document.getElementById('type').addEventListener('change', e => {
    type = e.target.value
})


function skeleton (canvas) {
    const ctx = canvas.getContext('2d')
    console.log(data1)
    const layers1 = data1.filter(d => d.shimmer !== true)
    const layers2 = data1.filter(d => d.shimmer === true)
    console.log(layers2)
    const sc = shadowCanvas(canvas, layers2)

    function render () {
        ctx.save()
        ctx.fillStyle = '#f8f8f8'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        layers1.forEach(d => {
            rounded(ctx, d.x, d.y, d.width, d.height, d.radius)
            ctx.fillStyle = d.color
            ctx.fill()
        })

        sc.render()
        ctx.drawImage(sc.canvas, 0, 0, canvas.width, canvas.height)

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
    document.body.appendChild(shadowCanvas)

    const ctx = shadowCanvas.getContext('2d')

    let offset = 0
    let step = 20

    function render () {
        ctx.save()
        ctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height)
        data.forEach(d => {
            rounded(ctx, d.x, d.y, d.width, d.height, d.radius)
            ctx.fillStyle = d.color
            ctx.fill()
        })

        ctx.globalCompositeOperation = 'source-in'

        if (offset > 1000) {
            offset = -1000
        }
        const gradient = ctx.createLinearGradient(offset, offset, offset + canvas.width, offset + canvas.height)
        gradient.addColorStop(0, 'rgba(0,0,0,0.02)')
        gradient.addColorStop(.5, 'rgba(0,0,0,0.1)')
        gradient.addColorStop(1, 'rgba(0,0,0,0.02)')

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
