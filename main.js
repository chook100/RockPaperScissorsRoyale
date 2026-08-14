const sheet = new Image();

function load_image(img, src) {
    return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
    });
}

let objects = [];

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


const SETTINGS_WINDOW = document.getElementById("settings")

let settings_opened = false;
const SETTINGS_COG = document.getElementById("open_settings")
SETTINGS_COG.addEventListener("click", ()=>{
    settings_opened = !settings_opened

    let visibility = settings_opened ? "flex" : "none" 
    SETTINGS_WINDOW.style.display = visibility;
})

let sounds_enabled = true;
const TOGGLE_SOUND = document.getElementById("toggle_sound")
TOGGLE_SOUND.addEventListener("click", () => {
    sounds_enabled = !sounds_enabled
    sounds_enabled ? TOGGLE_SOUND.textContent = "volume_up" : TOGGLE_SOUND.textContent = "volume_off"
})

const ctx = CANVAS.getContext("2d")

on_window_resize()

let group_size = Math.floor(CANVAS.width*CANVAS.height/125000);
let speed = 0.6

const SPEED_INPUT = document.getElementById("speed_input")
SPEED_INPUT.value = speed
SPEED_INPUT.addEventListener("input", (e) => {
    speed = e.target.value
})

const COUNT_INPUT = document.getElementById("count_input")
COUNT_INPUT.value = group_size
COUNT_INPUT.addEventListener("input", (e) => {
    group_size = Math.floor(e.target.value)
    start(false)
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
        this.vx = vx;
        this.vy = vy;

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
        this.x += this.vx*speed;
        this.y += this.vy*speed;
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
        if(!sounds_enabled)
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

        let ease = 1-(1-alpha)**3

        ctx.globalAlpha = 1-ease
        ctx.drawImage(sheet, this.type_trans*512+40, 40, 432, 432, this.x-2, this.y-2, Shape.SIZE*1.1, Shape.SIZE*1.1)
        ctx.globalAlpha = ease
        ctx.drawImage(sheet, this.type*512+40, 40, 432, 432, this.x-2, this.y-2, Shape.SIZE*1.1, Shape.SIZE*1.1)
        ctx.globalAlpha = 1
    }
}



function draw_chart(rock, paper, scissors){
    let length = objects.length

    let size = 16;
    let bottom = CANVAS.height-size

    let width = CANVAS.width

    ctx.fillStyle = "#6e6e6e90"
    ctx.fillRect(0, bottom, width*rock, size)

    ctx.fillStyle = "#d7d6d690"
    ctx.fillRect(width*rock, bottom, width*paper, size)

    ctx.fillStyle = "#F8445C90"
    ctx.fillRect(width*(rock+paper), bottom, width*scissors, size)

}   


var ms_start;

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

    for (let i = 0; i < objects.length; i++){
        for (let j = i + 1; j < objects.length; j++){
            if(!running) // weird edge case where this is taking a while to run, and cuts into the slider reset time
                return

            objects[i].resolve_object_collision(objects[j]);
        }
    }

            

    for(const object of objects){
        object.resolve_wall_collision();
    }

    for(const object of objects){
        object.render(ctx);
    }


    let counts = [0,0,0]

    for(const object of objects){
        counts[object.type]++;
    }

    let length = objects.length
    draw_chart(counts[2]/length, counts[0]/length, counts[1]/length)


    if(counts[0] == length || counts[1] == length || counts[2] == length){
        setTimeout(start, 1000) // restart
    }else{
        requestAnimationFrame(update); // update    
    }

    

}


let tween_start_ms;
function start_layout_tween(){
    ctx.fillStyle = "#F2F0EF"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    draw_chart(.33333,.33333,.33333)

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

    let theta_arc = 2*Math.PI/6;
    let object_length = objects.length

    let theta_offset = Math.random()*2*Math.PI/3;

    let n = group_size*3;

    if(objects.length > n) objects.splice(n)

    for(let i = 0; i < n; i++){
        let group = Math.floor(i / group_size);
        let beats = (group+2)%3;


        let lo_theta = group*2*Math.PI/3 + theta_offset;

        let theta = Math.random()*theta_arc+lo_theta;

        let variance = .4;
        let radius = Math.random()*starting_radius*variance+starting_radius*(1-variance)
        let x = Math.cos(theta)*radius;
        let y = Math.sin(theta)*radius;


        let object = objects[i];
        if(!object) object = objects[i] = new Shape(group, beats, cx, cy)

        object.x0 = object.x;
        object.y0 = object.y;

        object.type_trans = object.type;
        object.type = group;
        object.wins_against = beats;
        object.x1 = cx+x-Shape.SIZE/2;
        object.y1 = cy+y-Shape.SIZE/2;

        let [vx, vy] = random_dir()
        object.vx = vx;
        object.vy = vy;

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

    draw_chart(.33333,.33333,.33333)

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

    TIMER.classList.add("center_vertically")

    let count = 2;
    TIMER.textContent = "3"
    interval = setInterval(() => {
        TIMER.textContent = count

        if (count === 0) {
            ms_start = Date.now()
            TIMER.classList.remove("center_vertically")
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