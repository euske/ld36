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


//  Button
//
class Button extends Sprite {
    
    constructor(frame: Rect) {
	super(frame.center());
	this.mouseSelectable = true;
	this.imgsrc = new FillImageSource('blue', frame.sub(this.pos));
    }
    
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

    size: Vec2;
    price: number = 10;
    name: string = 'thing';
    
    rot90: boolean = false;
    inbasket: boolean = false;
    acceptable: boolean = false;

    constructor(pos: Vec2, color: string, size: Vec2) {
	super(pos);
	this.mouseSelectable = true;
	this.size = size;
	this.imgsrc = new FillImageSource(color, new Rect());
	this.updateShape();
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.isFocused()) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(4,4), 'white', 2);
	}
	if (this.inbasket && !this.acceptable) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(2,2), 'red', 1);
	}
    }

    move(v: Vec2, basket: Basket) {
	this.moveIfPossible(v);
	this.inbasket = basket.frame.containsPt(this.pos);
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
	return [this.layer.bounds];
    }
}


//  Customer
//
class Customer extends Entity {

    patience: number = 10;
    sessionStart: number = 0;
    walking: boolean = false;
    angry: boolean = false;
    space: number;
    speed: number;
    
    constructor(pos: Vec2) {
	super(pos);
	this.imgsrc = new FillImageSource('blue', new Rect(-10,-10,20,20));
	this.collider = this.imgsrc.dstRect;
	this.space = rnd(10);
	this.speed = rnd(1,4);
    }

    update() {
	super.update();
	if (this.walking) {
	    this.movePos(new Vec2(-this.speed*2, 0));
	    if (!this.layer.bounds.overlaps(this.getBounds())) {
		this.stop();
	    }
	} else if (!this.isSessionStarted() && !this.isReadyForSession()) {
	    let collider = this.getCollider().move(-this.space, 0);
	    let a = this.layer.findEntities((e:Entity) => {
		return (e instanceof Customer && e !== this &&
			e.getCollider().overlaps(collider));
	    });
	    if (a.length == 0) {
		this.movePos(new Vec2(-this.speed, 0));
	    }
	}
    }

    walk() {
	this.walking = true;
    }

    getTimeLeft() {
	return (this.patience - (this.time - this.sessionStart));
    }

    isReadyForSession() {
	return (this.pos.x <= 100);
    }

    isSessionStarted() {
	return (0 < this.sessionStart);
    }
    
    startSession() {
	this.sessionStart = this.time;
	return [
	    new Product(new Vec2(300,30), 'green', new Vec2(100,40))
	];
    }
}


//  Game
// 
class Game extends GameScene {

    priceBox: DialogBox;
    basket: Basket;
    
    customers: Customer[] = [];
    products: Product[] = [];
    
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
	this.layer.clicked.subscribe((_,sprite) => {
	    log("click:", sprite);
	});
	
	SPRITES = new ImageSpriteSheet(
	    APP.images['sprites'], new Vec2(16,16), new Vec2(8,8));
    }
    
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
	} else if (button == 0) {
	    this.layer.mousedown(p, button);
	    if (this.layer.mouseActive !== null) {
		this.startPos = p;
		this.prevPos = p;
	    }
	}
    }

    mouseup(p: Vec2, button: number) {
	if (this.priceBox.visible) {
	    this.priceBox.mouseup(p, button);
	} else if (button == 0) {
	    if (this.startPos !== null && this.startPos.equals(p)) {
		let sprite = this.layer.mouseActive;
		if (sprite instanceof Product) {
		    sprite.rotate();
		}
	    }
	    this.checkProducts(true);
	    this.prevPos = null;
	    this.layer.mouseup(p, button);
	}
    }
    
    mousemove(p: Vec2) {
	if (this.priceBox.visible) {
	    this.priceBox.mousemove(p);
	} else {
	    if (this.prevPos !== null) {
		let sprite = this.layer.mouseActive;
		if (sprite instanceof Product) {
		    sprite.move(p.sub(this.prevPos), this.basket);
		}
		this.prevPos = p;
	    }
	    this.layer.mousemove(p);
	}
    }

    init() {
	super.init();

	this.priceBox.start(this.layer);
	this.priceBox.visible = false;
	this.basket = new Basket(new Rect(8, 64, 200, 150));
	this.add(new Button(new Rect(260, 120, 40, 20)));
	
	this.initCustomers();
    }

    tick(t: number) {
	super.tick(t);
	this.checkProducts(false);
	if (this.priceBox.visible) {
	    this.priceBox.tick(t);
	}
	let customer = this.getCustomer();
	if (customer !== null) {
	    if (customer.isSessionStarted()) {
		if (customer.getTimeLeft() <= 0) {
		    this.walkCustomer(false);
		}
	    } else if (customer.isReadyForSession()) {
		this.initProducts(customer.startSession());
	    }
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
	let customer = this.getCustomer();
	if (customer !== null) {
	    let t = lowerbound(0, customer.getTimeLeft());
	    ctx.fillStyle = 'rgb(0,255,0)';
	    ctx.fillRect(bx+10, by+this.screen.height-20, t*10, 10);
	}
    }
    
    initCustomers() {
	this.customers = [
	    new Customer(new Vec2(100, 20)),
	    new Customer(new Vec2(200, 20))
	];
	for (let customer of this.customers) {
	    this.add(customer);
	}
    }

    walkCustomer(success: boolean) {
	this.priceBox.visible = false;
	let customer = this.getCustomer();
	if (customer !== null) {
	    customer.angry = !success;
	    customer.walk();
	    this.customers.shift();
	}
    }	

    getCustomer() {
	if (0 < this.customers.length) {
	    return this.customers[0];
	}
	return null;
    }
    
    initProducts(products: Product[]) {
	for (let product of this.products) {
	    product.stop();
	}
	this.products = products;
	for (let product of this.products) {
	    this.layer.addTask(product);
	}
    }

    openPriceBox() {
	this.priceBox.clear();
	this.priceBox.addDisplay('UMM... TOTAL IS...');
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
	menu.selected.subscribe((_, value) => {
	    log("selected:", value);
	    this.walkCustomer(value == 0);
	});
    }

    checkProducts(finish: boolean) {
	let ok = false;
	for (let product of this.products) {
	    product.acceptable = this.basket.contains(product);
	    if (!product.acceptable) return;
	    ok = true;
	}
	if (!ok) return;
	this.layer.checkEntityPairs((e0:Entity, e1:Entity) => {
	    if (e0 instanceof Product) {
		if (e1 instanceof Product) {
		    e0.acceptable = false;
		    e1.acceptable = false;
		    ok = false;
		}
	    }
	});
	if (ok && finish && !this.priceBox.visible) {
	    this.priceBox.visible = true;
	    this.openPriceBox();
	}
    }
}
