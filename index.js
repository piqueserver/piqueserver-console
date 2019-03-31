const MAX_SCALE = 10;

class Player {
    constructor(position, heading) {
        this.position = position;
        this.heading = heading;
        this.radius = 3;
        this.color = Math.random() > 0.5 ? "blue" : "green";
    }

    step() {
        this.position.x += (Math.random() - 0.5) * 4;
        this.position.y += (Math.random() - 0.5) * 4;
        this.heading = (this.heading + Math.random() - 0.5) % 360;
    }

    render(context) {
        let prev = context.save();
        let pos = this.position;

        const VIEW_RADIUS = 20;
        let gradient = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, VIEW_RADIUS);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        let heading = this.heading;
        context.beginPath();
        context.moveTo(pos.x, pos.y);
        context.arc(pos.x, pos.y, VIEW_RADIUS, heading - 0.2 * Math.PI, heading + 0.2 * Math.PI);
        context.fill();

        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        context.fillStyle = this.color;
        context.strokeStyle = "black";
        context.fill();
        context.stroke();

        context.restore(prev);
    }
}

let overview;

window.onload = function(){
    overview = new OverviewMap("#map-canvas");
}

function fetchOverview(url) {
    return fetch(url).then(resp => {
        return resp.blob();
    }).then(blob => {
        return createImageBitmap(blob);
    })
}

class OverviewMap {
    constructor(canvasId) {
        this.canvas = document.querySelector(canvasId);

        this.ctx = this.canvas.getContext("2d");
        this.ctx.fillStyle = "white";
        this.ctx.imageSmoothingEnabled = false;

        this.overview_bitmap = null;

        this.translate = {x: 0, y: 0};
        this.scale = 1;
        this.lastscale = this.scale;
        this.scrollpos = 0;

        this.lastDrag = {x: 0, y: 0};
        this.held = false;

        this.starttime = Date.now();

        this.players = [
            new Player({x: Math.random() * 512, y: Math.random() * 512}, 0),
            new Player({x: Math.random() * 512, y: Math.random() * 512}, 0),
            new Player({x: Math.random() * 512, y: Math.random() * 512}, 0),
            new Player({x: Math.random() * 512, y: Math.random() * 512}, 0),
            new Player({x: Math.random() * 512, y: Math.random() * 512}, 0),
        ];

        let loadingIconInterval = setInterval(() => {
            this.drawLoadingIcon();
        }, 1000 / 60);

        fetchOverview('https://piqueserver.walladge.net/overview').then(
            bitmap => {
                this.overview_bitmap = bitmap;
                clearInterval(loadingIconInterval);
                // TODO: add alpha transition before
                this.redraw();

                this.canvas.addEventListener('mousedown',
                    event => this.onMouseDown(event), false);

                this.canvas.addEventListener('mouseup',
                    event => this.onMouseUp(event), false);

                this.canvas.addEventListener('mouseout',
                    event => this.onMouseUp(event), false);

                this.canvas.addEventListener('wheel',
                    event => this.onMouseWheel(event), false);

                this.canvas.addEventListener('mousemove',
                    event => this.onMouseMove(event), false);

                let playerUpdateInterval = setInterval(() => {
                    this.updatePlayers();
                }, 500);
            })
            .catch((err) => {
                console.log("Error fetching Preview: " + err);
                clearInterval(loadingIconInterval);
                this.drawError(err)
            });


    }

    rotate2d(point, angle) {
        return {
            x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
            y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
        }
    }

    drawLoadingIcon() {
        let context = this.ctx;
        let canvas = this.canvas;
        let time = Date.now() - this.starttime;
        context.clearRect(0, 0, canvas.width, canvas.height);

        const CUBE_SIZE = 50;

        // animation time, from 0 to 1
        let animationTime = (time / 700) % 1;
        // angle from 0 to pi/2
        let angle = ((animationTime * Math.PI / 2));
        let jumpOffset = Math.pow((animationTime - 0.5) * 2, 2) * CUBE_SIZE;

        let center = {
            x: canvas.width/2,
            y: (canvas.height/2) - (CUBE_SIZE * 1.5) + jumpOffset,
        }

        let point1 = this.rotate2d({x: CUBE_SIZE, y: 0}, -angle + Math.PI/4);
        let point2 = this.rotate2d(point1, Math.PI * 0.5);
        let point3 = this.rotate2d(point1, Math.PI);
        let point4 = this.rotate2d(point1, Math.PI * 1.5);

        context.beginPath();
        context.moveTo(center.x + point1.x, center.y + point1.y / 2 + CUBE_SIZE * 1.7 - jumpOffset);
        context.lineTo(center.x + point2.x, center.y + point2.y / 2 + CUBE_SIZE * 1.7 - jumpOffset);
        context.lineTo(center.x + point3.x, center.y + point3.y / 2 + CUBE_SIZE * 1.7 - jumpOffset);
        context.lineTo(center.x + point4.x, center.y + point4.y / 2 + CUBE_SIZE * 1.7 - jumpOffset);
        context.fillStyle = 'gray';
        context.fill();

        context.beginPath();
        context.moveTo(center.x + point1.x, center.y + point1.y / 2);
        context.lineTo(center.x + point2.x, center.y + point2.y / 2);
        context.lineTo(center.x + point3.x, center.y + point3.y / 2);
        context.lineTo(center.x + point4.x, center.y + point4.y / 2);
        context.fillStyle = 'hsl(240, 100%, 70%)';
        context.fill();

        context.beginPath();
        context.moveTo(center.x + point2.x, center.y + point2.y / 2);
        context.lineTo(center.x + point1.x, center.y + point1.y / 2);
        context.lineTo(center.x + point1.x, center.y + (CUBE_SIZE * 1.15) + point1.y / 2);
        context.lineTo(center.x + point2.x, center.y + (CUBE_SIZE * 1.15) + point2.y / 2);
        let tone1 = Math.round((1 - animationTime) * 50) + 20;
        context.fillStyle = 'hsl(240, 100%, ' + tone1 + '%)';
        // context.fillStyle = 'black';
        context.fill();

        context.beginPath();
        context.moveTo(center.x + point2.x, center.y + point2.y / 2);
        context.lineTo(center.x + point3.x, center.y + point3.y / 2);
        context.lineTo(center.x + point3.x, center.y + (CUBE_SIZE * 1.15) + point3.y / 2);
        context.lineTo(center.x + point2.x, center.y + (CUBE_SIZE * 1.15) + point2.y / 2);
        let tone2 = Math.round((animationTime) * 50) + 20;
        context.fillStyle = 'hsl(240, 100%, ' + tone2 + '%)';
        // context.fillStyle = 'red';
        context.fill();

        /*
        context.beginPath();
        context.moveTo(center.x, center.y);
        context.lineTo(center.x + point1.x, center.y + point1.y / 2);
        context.strokeStyle = "black"
        context.stroke()
        */
    }

    drawError(err) {
        let context = this.ctx;
        let canvas = this.canvas;
        let time = Date.now();
        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height,
        );
        context.font = "20px sans"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillStyle = 'black';
        context.fillText("Failed to load preview",
            canvas.width/2, canvas.height/2, canvas.width)

        context.font = "12px sans"
        context.fillText(err,
            canvas.width/2, canvas.height/2 + 40, canvas.width)
    }

    onMouseDown(event) {
        this.lastDrag.x = event.x;
        this.lastDrag.y = event.y;
        this.held = true;
        return false;
    }

    onMouseUp(event) {
        this.held = false;
        this.redraw();
        return false;
    }

    onMouseMove(event) {
        if (!this.held) {
            return;
        }
        // the higher the scale is, the less we want mouse movements to translate
        this.translate.x += (event.x - this.lastDrag.x) * 1;
        this.translate.y += (event.y - this.lastDrag.y) * 1;
        this.lastDrag.x = event.x;
        this.lastDrag.y = event.y;

        this.clampInBounds();

        this.redraw();
    }

    onMouseWheel(event) {
        console.log(event);
        event.preventDefault();
        let canvas = this.canvas;
        // NOTE: this is terrible, but unfortunately chrome and firefox scale
        // their deltaY values differently
        if (event.deltaY > 1) {
            this.scrollpos -= 2;
        } else {
            this.scrollpos += 2;
        }
        this.scale = Math.pow(1.05, this.scrollpos);
        if (this.scale < 1) {
            this.scrollpos = 0;
            this.scale = 1;
            return false;
        }
        else if (this.scale > MAX_SCALE) {
            this.scrollpos += event.deltaY;
            this.scale = MAX_SCALE;
            return false;
        }
        let scalediff = this.scale - this.lastscale;
        this.lastscale = this.scale

        this.translate.x += -((event.x - canvas.offsetLeft) * scalediff);
        this.translate.y += -((event.y - canvas.offsetTop) * scalediff);

        this.clampInBounds();

        this.redraw();
        return false;
    }

    updatePlayers() {
        this.players.forEach(player => {
            player.step();
        });

        this.redraw();
    }

    redraw() {
        let ctx = this.ctx;
        let canvas = this.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // identity transformation matrix, to reset the transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(this.translate.x, this.translate.y);
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(this.overview_bitmap, 0, 0);

        this.players.forEach(player => {
            player.render(this.ctx);
        });

        this.drawGrid();
    }

    drawGrid() {
        let ctx = this.ctx;
        let prev = ctx.save();

        ctx.strokeStyle = "rgba(10, 10, 10, 0.3)"

        for(let i = 1; i < 8; i++) {
            let height = (512/8 * i ) + 0.5
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(512, height);
            ctx.stroke();
        }

        for(let i = 1; i < 8; i++) {
            let width = (512/8 * i ) + 0.5
            ctx.beginPath();
            ctx.moveTo(width, 0);
            ctx.lineTo(width, 512);
            ctx.stroke();
        }

        ctx.restore(prev);
    }

    clampInBounds() {
        let canvas = this.canvas;
        let translate = this.translate;
        let scale = this.scale;
        translate.x = Math.min(translate.x, 0);
        translate.y = Math.min(translate.y, 0);
        translate.x = Math.max(translate.x, -((canvas.width * scale) - canvas.width));
        translate.y = Math.max(translate.y, -((canvas.height * scale) - canvas.height));
    }

}
