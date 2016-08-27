/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///
let SPRITES: SpriteSheet;


//  Product
//
class Product extends Entity {

    scene: Game;

    constructor(scene: Game, color: string, size: Vec2) {
	super(new Vec2(100,100));
	let rect = new Rect(0, 0, size.x, size.y)
	this.scene = scene;
	this.imgsrc = new FillImageSource(color, rect);
	this.collider = this.imgsrc.dstRect;
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.scene.focus === this) {
	    let rect = this.getCollider().getAABB().inflate(4,4);
	    ctx.strokeStyle = 'white';
	    ctx.lineWidth = 2;
	    ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
	}
    }

    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.scene.screen];
    }
}


//  Game
// 
class Game extends GameScene {

    textBox: DialogBox;
    statusBox: TextBox;
    
    constructor(app: App) {
	super(app);
	let font = new Font(APP.images['font'], 'white');
	let hifont = new InvertedFont(APP.images['font'], 'white');
	let lineheight = 8;
	let linespace = 4;
	let padding = 8;
	let statusWidth = lineheight*10+padding*2;
	let statusHeight = (lineheight+linespace)*11-linespace+padding*2;
	let statusRect = this.screen.resize(statusWidth, statusHeight, -1, +1).move(-8,8);
	this.statusBox = new TextBox(statusRect);
	this.statusBox.font = font;
	this.statusBox.padding = padding;
	this.statusBox.linespace = linespace;
	this.statusBox.background = 'rgba(0,0,0,0.5)'
	
	let textWidth = this.screen.width-16;
	let textHeight = (lineheight+linespace)*5-linespace+padding*2;
	let textRect = this.screen.resize(textWidth, textHeight, 0, -1).move(0,-8);
	this.textBox = new DialogBox(textRect);
	this.textBox.font = font;
	this.textBox.hifont = font;
	this.textBox.padding = padding;
	this.textBox.linespace = linespace;
	this.textBox.background = 'rgba(0,0,0,0.5)'
	
	SPRITES = new ImageSpriteSheet(
	    APP.images['sprites'], new Vec2(16,16), new Vec2(8,8));
    }
    
    init() {
	super.init();
	this.add(this.textBox);
	this.add(this.statusBox);
	
	this.add(new Product(this, 'green', new Vec2(100,100)));

	this.textBox.addDisplay('FOOO');
    }

    tick(t: number) {
	super.tick(t);
    }

    mousedown(p: Vec2, button: number) {
	this.updateFocus(p);
	if (button == 0 && this.focus !== null) {
	    this.prevPos = p;
	}
    }

    mouseup(p: Vec2, button: number) {
	this.updateFocus(p);
	if (button == 0) {
	    this.prevPos = null;
	}
    }
    
    mousemove(p: Vec2) {
	if (this.prevPos !== null) {
	    let v = p.sub(this.prevPos);
	    this.focus.moveIfPossible(v);
	    this.prevPos = p;
	} else {
	    this.updateFocus(p);
	}
    }
    
    focus: Entity = null;
    prevPos: Vec2 = null;
    
    updateFocus(p: Vec2) {
	for (let entity of this.layer.findEntitiesByPt(p)) {
	    this.focus = entity;
	    return;
	}
	this.focus = null;
    }

    keydown(key: number) {
	this.textBox.keydown(key);
    }    

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	ctx.fillStyle = 'rgb(255,0,0)';
	ctx.fillRect(bx, by, this.screen.width, 50);
	ctx.fillStyle = 'rgb(255,255,20)';
	ctx.fillRect(bx, by+54, this.screen.width, this.screen.height-54);
	super.render(ctx, bx, by);
	// draw a textbox border.
	let rect = this.textBox.frame.inflate(-2,-2);
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 2;
	ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
    }
}
