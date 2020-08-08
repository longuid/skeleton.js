
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


function skeleton (canvas, data) {
    const ctx = canvas.getContext('2d')
    let offset = 0
    let step = 20

    let type = 'color-burn'

    document.getElementById('type').addEventListener('change', e => {
        type = e.target.value
    })


    function render () {
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // ctx.fillStyle = '#ffffff'
        // ctx.fillRect(0, 0, canvas.width, canvas.height)
        data1.forEach(d => {
            rounded(ctx, d.x, d.y, d.width, d.height, d.radius)
            ctx.fillStyle = d.color
            ctx.fill()
        })

        ctx.globalCompositeOperation = type

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

        // ctx.globalCompositeOperation = 'destination-out'
        ctx.restore()

        requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
}
