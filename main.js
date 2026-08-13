const sheet = new Image();

function load_image(img, src) {
    return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
    });
}

let running = false;

const sfx = [new Audio("paper.wav"), new Audio("scissors.wav"), new Audio("rock.wav")];
sfx[0].volume = 0.1
sfx[1].volume = 0.1
sfx[2].volume = 0.2


let starting_radius;

function on_window_resize(){
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    let min = Math.min(CANVAS.width, CANVAS.height)/2;
    starting_radius = min-min*.1
}
window.addEventListener("resize", on_window_resize)

window.onload = main;

const TIMER = document.getElementById("timer")
const CANVAS = document.getElementById("canvas")





let enable_sound = true;
const TOGGLE_SOUND = document.getElementById("toggle_sound")
TOGGLE_SOUND.addEventListener("click", () => {
    enable_sound = !enable_sound
    enable_sound ? TOGGLE_SOUND.textContent = "volume_up" : TOGGLE_SOUND.textContent = "volume_off"
})

const ctx = CANVAS.getContext("2d")

on_window_resize()


let group_size = Math.floor(CANVAS.width*CANVAS.height/75000);
let speed = Math.max(CANVAS.width, CANVAS.height)/1000


const SPEED_SLIDER = document.getElementById("speed_slider")
SPEED_SLIDER.value = speed
SPEED_SLIDER.addEventListener("input", (e) => {
    speed = e.target.value
    start(true)
})

const COUNT_SLIDER = document.getElementById("count_slider")
COUNT_SLIDER.value = group_size
COUNT_SLIDER.addEventListener("input", (e) => {
    group_size = e.target.value
    start(true)
})





ctx.fillStyle = "#F2F0EF"
ctx.fillRect(0, 0, canvas.width, canvas.height);

function clamp(val, min, max){
    if(val >= min && val <= max)
        return val;
    else if(val < min){
        return min;
    }else{
        return max;
    }
}

function random_dir(){
    const angle = Math.random()*2*Math.PI;

    return [Math.cos(angle), Math.sin(angle)];
}

class Shape{
    static SIZE = 50;

    constructor(type, wins_against, x, y){
        this.type = type
        this.wins_against = wins_against
        this.x = x
        this.y = y

        let [vx, vy] = random_dir()
        this.vx = vx*speed;
        this.vy = vy*speed;


        // tween
        this.x0;
        this.y0;

        this.x1;
        this.y1;

        this.type_trans;
    }

    wins(other){
        return other == this.wins_against;
    }

    update_pos(){
        this.x += this.vx;
        this.y += this.vy;
    }

    resolve_wall_collision(){
        const max_x = CANVAS.width-Shape.SIZE;
        const max_y = CANVAS.height-Shape.SIZE;

        if (this.x < 0) {
            this.x = 0;
            if (this.vx < 0)
                this.vx *= -1;
        }

        if (this.x > max_x) {
            this.x = max_x;
            if (this.vx > 0)
                this.vx *= -1;
        }

        if (this.y < 0) {
            this.y = 0;
            if (this.vy < 0)
                this.vy *= -1;

        }

        if (this.y > max_y){
            this.y = max_y;
            if (this.vy > 0)
                this.vy *= -1;
        }

    }

    play_sfx(){
        if(!enable_sound)
            return

        sfx[this.type].currentTime = 0;
        sfx[this.type].play();
    }

    overlap(a) {
        const dx = a.x-this.x;
        const dy = a.y-this.y;
        const ox = Shape.SIZE - Math.abs(dx);
        const oy = Shape.SIZE - Math.abs(dy);

        if (ox <= 0 || oy <= 0)
            return null;

        return ox < oy ? {nx: Math.sign(dx) || 1, ny: 0, depth: ox} : {nx: 0, ny: Math.sign(dy) || 1, depth: oy};
    }

    resolve_object_collision(other) {
        const hit = this.overlap(other);
        if (!hit) return;

        const push = hit.depth / 2;
        this.x -= hit.nx*push;
        this.y -= hit.ny*push;
        other.x += hit.nx*push;
        other.y += hit.ny*push;

        const closing = (this.vx - other.vx)*hit.nx + (this.vy - other.vy)*hit.ny;

        if (closing <= 0) return;

        if(other.type == this.wins_against){
            other.type = this.type;
            other.wins_against = this.wins_against
            this.play_sfx()
        }

        if(other.wins_against == this.type){
            this.type = other.type;
            this.wins_against = other.wins_against
            this.play_sfx()
        }


        this.vx  -= closing*hit.nx;
        this.vy  -= closing*hit.ny;
        other.vx += closing*hit.nx;
        other.vy += closing*hit.ny;
    }

    render(ctx, alpha = 1){
        ctx.font = "55px courier-new";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // ctx.fillStyle = "blue"
        // ctx.fillRect(this.x, this.y, Shape.SIZE, Shape.SIZE)



        ctx.globalAlpha = 1-alpha
        ctx.drawImage(sheet, this.type_trans*512+40, 40, 432, 432, this.x-2, this.y-2, Shape.SIZE*1.1, Shape.SIZE*1.1)
        ctx.globalAlpha = alpha
        ctx.drawImage(sheet, this.type*512+40, 40, 432, 432, this.x-2, this.y-2, Shape.SIZE*1.1, Shape.SIZE*1.1)
        ctx.globalAlpha = 1
    }
}

var ms_start;
let objects = []

let last_time = 0;
function update(now){
    if(!running)
        return;


    ctx.fillStyle = "#F2F0EF"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if(now-last_time < (1/60)){
        return;
    }
    last_time = now;

    round_elapsed = Date.now()-ms_start

    elapsed_s = Math.floor(round_elapsed/1000)

    TIMER.textContent = `${String(Math.floor(elapsed_s/60)).padStart(2, "0")}:${String(elapsed_s%60).padStart(2, "0")}`;

    for(const object of objects){
        object.update_pos();
    }

    for (let i = 0; i < objects.length; i++)
        for (let j = i + 1; j < objects.length; j++)
            objects[i].resolve_object_collision(objects[j]);

    for(const object of objects){
        object.resolve_wall_collision();
    }

    for(const object of objects){
        object.render(ctx);
    }
    

    let found = objects[0].type

    for(const object of objects){
        if(object.type != found){
            requestAnimationFrame(update);
            return;
        }
    }

    setTimeout(start, 1000)


}


let tween_start_ms;
function start_layout_tween(){
    ctx.fillStyle = "#F2F0EF"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let elapsed = Date.now()-tween_start_ms

    let alpha = clamp(elapsed/1000, 0, 1);


    for(const object of objects){
        let ease = 1-(1-alpha)**3

        object.x = object.x0+(object.x1-object.x0)*ease
        object.y = object.y0+(object.y1-object.y0)*ease
        object.resolve_wall_collision()
        object.render(ctx, alpha)
    }

    if (alpha < 1) {
        requestAnimationFrame(start_layout_tween)
    }
}



function layout(){

    let cx = CANVAS.width/2
    let cy = CANVAS.height/2

    let theta_arc = 2*Math.PI/4;
    let object_length = objects.length

    let theta_offset = Math.random()*2*Math.PI/3;

    objects.length = group_size*3
    for(let i = 0; i < group_size*3; i++){
        let group = Math.floor(i / group_size);
        let beats = ((group-1 % 3) + 3) % 3;

        console.log(group, beats)

        let lo_theta = group*2*Math.PI/3 + theta_offset;

        let theta = Math.random()*theta_arc+lo_theta;
        let x = Math.cos(theta)*starting_radius;
        let y = Math.sin(theta)*starting_radius;


        if(i >= object_length){
            objects[i] = new Shape(type=group, wins_against=beats, cx, cy)
        }
        objects[i].x0 = objects[i].x;
        objects[i].y0 = objects[i].y;

        objects[i].type_trans = objects[i].type;
        objects[i].type = group;
        objects[i].wins_against = beats;
        objects[i].x1 = cx+x;
        objects[i].y1 = cy+y

        let [vx, vy] = random_dir()
        objects[i].vx = vx*speed;
        objects[i].vy = vy*speed;
    }

    tween_start_ms = Date.now()
    requestAnimationFrame(start_layout_tween)
}


// function restart(){
//     layout()
// }


function start(skip_countdown = false){
    running = false;
    ctx.fillStyle = "#F2F0EF"
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    layout()


    for(const object of objects){
        object.render(ctx)
    }

    if(skip_countdown){
        running = true;
        requestAnimationFrame(update)
        return;
    }

    start_countdown()
}

let interval;
function start_countdown(){
    

    clearInterval(interval);

    let count = 3;
    interval = setInterval(() => {
        TIMER.textContent = count

        if (count === 0) {
            ms_start = Date.now()
            running = true;
            requestAnimationFrame(update)
            clearInterval(interval);
            return;
        }

        count--;
    }, 1000);

}


async function main(){
    await load_image(sheet, "assets.png")

    start()
}




main()