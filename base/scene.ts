/// <reference path="utils.ts" />
/// <reference path="geom.ts" />
/// <reference path="entity.ts" />
/// <reference path="layer.ts" />


//  Scene
//
class Scene {

    app: App;
    screen: Rect;
    time: number = 0;

    constructor(app: App) {
	this.app = app;
	this.screen = new Rect(0, 0, app.canvas.width, app.canvas.height);
    }

    changeScene(scene: Scene) {
	let app = this.app;
	app.post(function () { app.init(scene); });
    }
  
    init() {
	// [OVERRIDE]
    }

    tick(t: number) {
	// [OVERRIDE]
	this.time = t;
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	// [OVERRIDE]
    }

    setDir(v: Vec2) {
	// [OVERRIDE]
    }

    setAction(action: boolean) {
	// [OVERRIDE]
    }
    
    setCancel(cancel: boolean) {
	// [OVERRIDE]
    }

    keydown(key: number) {
	// [OVERRIDE]
    }

    keyup(key: number) {
	// [OVERRIDE]
    }

    mousedown(p: Vec2, button: number) {
	// [OVERRIDE]
    }

    mouseup(p: Vec2, button: number) {
	// [OVERRIDE]
    }
    
    mousemove(p: Vec2) {
	// [OVERRIDE]
    }

}


//  HTMLScene
//
class HTMLScene extends Scene {

    text: string;

    constructor(app: App, text: string) {
	super(app);
	this.text = text;
    }

    init() {
	super.init();
	let scene = this;
	let frame = this.app.frame;
	let e = this.app.addElement(
	    new Rect(frame.width/8, frame.height/4,
		     3*frame.width/4, frame.height/2));
	e.align = 'left';
	e.style.padding = '10px';
	e.style.color = 'black';
	e.style.background = 'white';
	e.style.border = 'solid black 2px';
	e.innerHTML = this.text;
	e.onmousedown = (function (e) { scene.change(); });
    }
  
    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
    }

    change() {
	// [OVERRIDE]
    }

    mousedown(p: Vec2, button: number) {
	this.change();
    }

    keydown(key: number) {
	this.change();
    }
  
}


//  GameScene
// 
class GameScene extends Scene {

    layer: ScrollLayer;
    entities: Entity[];

    constructor(app: App) {
	super(app);
	this.layer = new ScrollLayer(this.screen);
	this.layer.bounds = this.screen;
    }

    init() {
	// [OVERRIDE]
	super.init();
	this.layer.init();
	this.entities = this.layer.entities;
    }

    tick(t: number) {
	// [OVERRIDE]
	super.tick(t);
	this.layer.tick(t);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	// [OVERRIDE]
	super.render(ctx, bx, by);
	this.layer.render(ctx, bx, by);
    }

    add(task: Task) {
	this.layer.addTask(task);
    }
}
