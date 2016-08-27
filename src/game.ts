/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///
let SPRITES: SpriteSheet;

function drawRect(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string, width: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
}


//  Basket
//
class Basket extends Sprite {

    frame: Rect;

    constructor(frame: Rect) {
	super(new Vec2());
	this.frame = frame;
    }
    
    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	drawRect(ctx, bx, by, this.frame.inflate(4,4), 'black', 4);
    }

    contains(product: Product) {
	return this.frame.containsRect(product.getCollider() as Rect);
    }
}


//  Product
//
class Product extends Entity {

    scene: Game;
    size: Vec2;
    price: number = 10;
    name: string = 'thing';
    
    rot90: boolean = false;
    inbasket: boolean = false;
    acceptable: boolean = false;

    constructor(scene: Game, pos: Vec2, color: string, size: Vec2) {
	super(pos);
	this.scene = scene;
	this.size = size;
	this.imgsrc = new FillImageSource(color, new Rect());
	this.updateShape();
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.scene.focus === this) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(4,4), 'white', 2);
	}
	if (this.inbasket && !this.acceptable) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(2,2), 'red', 1);
	}
    }

    move(v: Vec2) {
	this.moveIfPossible(v);
	this.inbasket = this.scene.basket.frame.containsPt(this.pos);
	this.updateShape();
    }

    rotate() {
	this.rot90 = !this.rot90;
	this.updateShape();
    }

    updateShape() {
	let size = (this.inbasket)? this.size : this.size.scale(0.2);
	if (this.rot90) {
	    this.rotation = Math.PI/2;
	    this.collider = new Rect(-size.y/2, -size.x/2, size.y, size.x);
	} else {
	    this.rotation = 0;
	    this.collider = new Rect(-size.x/2, -size.y/2, size.x, size.y)
	}
	this.imgsrc.dstRect = new Rect(-size.x/2, -size.y/2, size.x, size.y);
    }

    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.scene.screen];
    }
}


//  Game
// 
class Game extends GameScene {

    priceBox: DialogBox;
    basket: Basket;
    products: Product[];
    
    constructor(app: App) {
	super(app);
	let font = new Font(APP.images['font'], 'white');
	let hifont = new InvertedFont(APP.images['font'], 'white');
	
	let textRect = this.screen.resize(160, 100);
	this.priceBox = new DialogBox(textRect);
	this.priceBox.font = font;
	this.priceBox.hifont = hifont;
	this.priceBox.padding = 8;
	this.priceBox.linespace = 4;
	this.priceBox.background = 'rgba(0,0,0,0.5)'
	
	SPRITES = new ImageSpriteSheet(
	    APP.images['sprites'], new Vec2(16,16), new Vec2(8,8));
    }
    
    init() {
	super.init();

	this.priceBox.start(this.layer);
	this.priceBox.visible = false;
	this.basket = new Basket(new Rect(8, 64, 200, 150));

	this.initProducts();
    }

    tick(t: number) {
	super.tick(t);
	if (this.checkProducts() && !this.priceBox.visible) {
	    this.priceBox.visible = true;
	    this.openTextBox();
	}
	if (this.priceBox.visible) {
	    this.priceBox.tick(t);
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	ctx.fillStyle = 'rgb(255,0,0)';
	ctx.fillRect(bx, by, this.screen.width, 50);
	ctx.fillStyle = 'rgb(255,255,20)';
	ctx.fillRect(bx, by+54, this.screen.width, this.screen.height-54);
	this.basket.render(ctx, bx, by);
	super.render(ctx, bx, by);
	// draw a textbox and its border.
	if (this.priceBox.visible) {
	    this.priceBox.render(ctx, bx, by);
	    drawRect(ctx, bx, by, this.priceBox.frame.inflate(-2,-2), 'white', 2);
	}
    }
    
    focus: Product = null;
    startPos: Vec2 = null;
    prevPos: Vec2 = null;

    keydown(key: number) {
	if (this.priceBox.visible) {
	    this.priceBox.keydown(key);
	}
    }    

    mousedown(p: Vec2, button: number) {
	if (this.priceBox.visible) {
	    this.priceBox.mousedown(p, button);
	} else {
	    this.updateFocus(p);
	    if (button == 0 && this.focus !== null) {
		this.startPos = p;
		this.prevPos = p;
	    }
	}
    }

    mouseup(p: Vec2, button: number) {
	if (this.priceBox.visible) {
	    this.priceBox.mouseup(p, button);
	} else {
	    this.updateFocus(p);
	    if (button == 0) {
		if (this.startPos.equals(p)) {
		    this.focus.rotate();
		}
		this.prevPos = null;
	    }
	}
    }
    
    mousemove(p: Vec2) {
	if (this.priceBox.visible) {
	    this.priceBox.mousemove(p);
	} else {
	    if (this.prevPos !== null) {
		let v = p.sub(this.prevPos);
		this.focus.move(v);
		this.prevPos = p;
	    } else {
		this.updateFocus(p);
	    }
	}
    }

    initProducts() {
	this.layer.init();
	this.products = [
	    new Product(this, new Vec2(300,30), 'green', new Vec2(100,40))
	];
	for (let product of this.products) {
	    this.layer.addTask(product);
	}
    }

    openTextBox() {
	this.priceBox.clear();
	this.priceBox.addDisplay('HOW MUCH IN TOTAL?');
	// TODO: add Tax
	let n = 5;
	let menu = this.priceBox.addMenu();
	let list: string[] = [];
	let total = this.products.reduce(
	    (r,product) => { return r+product.price; },
	    0);
	let correct = rnd(n);
	for (let i = 0; i < n; i++) {
	    let d = (i == correct)? 0 : rnd(-total/4, total/4);
	    menu.addItem(new Vec2(16, i*10+12), '$'+(total+d), d);
	}
    }

    checkProducts() {
	let ok = false;
	for (let product of this.products) {
	    product.acceptable = this.basket.contains(product);
	    if (!product.acceptable) return false;
	    ok = true;
	}
	if (!ok) return false;
	this.layer.checkEntityPairs((e0:Entity, e1:Entity) => {
	    if (e0 instanceof Product) {
		if (e1 instanceof Product) {
		    e0.acceptable = false;
		    e1.acceptable = false;
		    ok = false;
		}
	    }
	});
	return ok;
    }
    
    updateFocus(p: Vec2) {
	let a = this.layer.findEntities((e:Entity) => {
	    return e.getCollider().containsPt(p);
	})
	for (let entity of a) {
	    if (entity instanceof Product) {
		this.focus = entity;
	    }
	    return;
	}
	this.focus = null;
    }
}
