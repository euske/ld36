/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///
let SPRITES: SpriteSheet;
let FONT: Font;
let COLORFONT: Font;
let SHFONT: Font;
let HIFONT: Font;
const PLACERECT = new Rect(0, 54, 220, 186);
const LANERECT = new Rect(0, 0, 320, 50);
const PRODRECT = new Rect(220, 54, 100, 186);
const CUSTOMERS_INIT = 3;
const CUSTOMERS_MAX = 8;

function multiply(c: string, n: number) {
    let s = '';
    while (0 < n--) {
	s += c;
    }
    return s;
}

function fillRect(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(bx+rect.x, by+rect.y, rect.width, rect.height);
}

function drawRect(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string, width: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
}

function unionRects(rects: Rect[]) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let rect of rects) {
	x0 = Math.min(x0, rect.x);
	x1 = Math.max(x1, rect.right());
	y0 = Math.min(y0, rect.y);
	y1 = Math.max(y1, rect.bottom());
    }
    if (x1 < x0 || y1 < y0) {
	return new Rect();
    } else {
	return new Rect(x0, y0, x1-x0, y1-y0);
    }
}


//  Board
// 
class Board {
    
    rects: Rect[] = []

    getBounds() {
	return unionRects(this.rects);
    }

    hasOverlap(rect0: Rect) {
	for (let rect1 of this.rects) {
	    if (rect1.overlapsRect(rect0)) {
		return true;
	    }
	}
	return false;
    }

    getFitting(w: number, h: number) {
	let bounds = this.getBounds();
	for (let y = bounds.y; y < bounds.bottom(); y++) {
	    for (let x = bounds.x; x < bounds.right(); x++) {
		let rect0 = new Rect(x,y,w,h);
		if (bounds.containsRect(rect0) && !this.hasOverlap(rect0)) {
		    return rect0;
		}
		let rect1 = new Rect(x,y,h,w);
		if (bounds.containsRect(rect1) && !this.hasOverlap(rect1)) {
		    return rect1;
		}
	    }
	}
	let sizes = [
	    Math.max(bounds.width+w, h),  // 0
	    Math.max(bounds.width+h, w),  // 1 
	    Math.max(w, bounds.height+h), // 2
	    Math.max(h, bounds.height+w), // 3
	];
	let minconf = 0;
	for (let conf = 1; conf < sizes.length; conf++) {
	    if (sizes[conf] < sizes[minconf]) {
		minconf = conf;
	    }
	}
	switch (minconf) {
	case 0:
	    return new Rect(bounds.right(), bounds.y, w, h);
	case 1:
	    return new Rect(bounds.right(), bounds.y, h, w);
	case 2:
	    return new Rect(bounds.x, bounds.bottom(), h, w);
	default:
	    return new Rect(bounds.x, bounds.bottom(), w, h);
	}
    }
    
    dump() {
	let bounds = this.getBounds();
	log('rects='+this.rects+', bounds='+bounds);
	for (let y = bounds.y; y < bounds.bottom(); y++) {
	    let line = '';
	    for (let x = bounds.x; x < bounds.right(); x++) {
		let v = 0;
		let p = new Vec2(x,y);
		for (let i = 0; i < this.rects.length; i++) {
		    if (this.rects[i].containsPt(p)) {
			v = i+1;
			break;
		    }
		}
		line += v.toString();
	    }
	    log(' '+y+': '+line);
	}
    }
    
    add(size: Vec2) {
	let rect = this.getFitting(size.x, size.y);
	this.rects.push(rect);
	return (size.x != rect.width || size.y != rect.height);
    }
}


//  Button
//
class Button extends Sprite {
    
    constructor(frame: Rect) {
	super(frame.center());
	this.mouseSelectable = true;
	this.imgsrc = new FillImageSource('white', frame.sub(this.pos));
    }
    
}


//  Balloon
//
class Balloon extends TextBox {
    
    constructor(pos: Vec2, text: string) {
	super(new Rect(-20, -5, 40, 10));
	this.pos = pos;
	this.font = FONT;
	this.lifetime = 1;
	this.putText([text], 'center', 'center');
    }

    update() {
	this.movePos(new Vec2(0, -2));
    }
}


//  Product
//
class Product extends Entity {

    customer: Customer;
    price: number = 10;
    name: string = 'thing';
    size: Vec2 = new Vec2(1,1);
    
    rot90: boolean = false;
    realsize: boolean = false;
    acceptable: boolean = false;

    constructor(customer: Customer, color: string, size: Vec2) {
	super(new Vec2());
	this.mouseSelectable = true;
	this.customer = customer;
	this.size = size;
	this.imgsrc = new FillImageSource(color, new Rect());
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.isFocused()) {
	    drawRect(ctx, bx, by, this.getBounds().getAABB().inflate(4,4), 'white', 2);
	}
	if (this.realsize && !this.acceptable) {
	    drawRect(ctx, bx, by, this.getBounds().getAABB().inflate(2,2), 'red', 1);
	}
    }

    start(layer: Layer) {
	super.start(layer);
	this.updateShape();
    }	

    move(v: Vec2) {
	this.moveIfPossible(v);
	let realsize = this.customer.basket.containsPt(this.pos);
	if (this.realsize != realsize) {
	    this.realsize = realsize;
	    playSound(APP.audios['put']);
	}
	this.updateShape();
    }

    rotate() {
	this.rot90 = !this.rot90;
	this.updateShape();
    }

    getSize() {
	return (this.realsize)? this.size.scale(16) : this.size.scale(4);
    }

    getBounds() {
	let size = this.getSize();
	let bounds = ((this.rot90)?
		      this.pos.expand(size.y, size.x) :
		      this.pos.expand(size.x, size.y));
	if (!this.realsize) {
	    bounds = bounds.inflate(2,2);
	}
	return bounds;
    }
    
    updateShape() {
	let size = this.getSize();
	if (this.rot90) {
	    this.rotation = Math.PI/2;
	    this.collider = new Rect(-size.y/2, -size.x/2, size.y, size.x);
	} else {
	    this.rotation = 0;
	    this.collider = new Rect(-size.x/2, -size.y/2, size.x, size.y);
	}
	if (!this.realsize) {
	    this.collider = null;
	}
	this.imgsrc.dstRect = new Rect(-size.x/2, -size.y/2, size.x, size.y);
    }

    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.layer.bounds];
    }
}

class Product1 extends Product {
    constructor(customer: Customer) {
	super(customer, 'green', new Vec2(1,2));
	this.price = rnd(10, 20);
	this.name = 'veg.';
    }
}
class Product2 extends Product {
    constructor(customer: Customer) {
	super(customer, 'red', new Vec2(1,1));
	this.price = rnd(5, 10);
	this.name = 'apple';
    }
}
class Product3 extends Product {
    constructor(customer: Customer) {
	super(customer, 'rgb(128,64,0)', new Vec2(1,3));
	this.price = rnd(5, 10);
	this.name = 'beer';
    }
}


//  Customer
//
class Customer extends Entity {

    sessionStart: number = -1;
    walking: boolean = false;
    angry: boolean = false;
    basket: Rect = null;
    patience: number = 0;
    extra: number = 16;
    space: number = 8;
    speed: number = 2;
    
    constructor(spriteno: number) {
	super(new Vec2());
	this.imgsrc = SPRITES.get(spriteno);
	this.collider = this.imgsrc.dstRect;
	this.space = 8+rnd(8);
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
		this.movePos(new Vec2(-rnd(this.speed), 0));
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
	return (this.pos.x <= 64);
    }

    isSessionStarted() {
	return (0 <= this.sessionStart);
    }
    
    startSession() {
	let products = this.getProducts();
	let board = new Board();
	for (let product of products) {
	    product.rot90 = board.add(product.size);
	    board.dump();
	}
	let bounds = board.getBounds();
	this.sessionStart = this.time;
	this.basket = PLACERECT.resize(
	    this.extra+bounds.width*16,
	    this.extra+bounds.height*16);
	return products;
    }

    getProducts() {
	this.patience = 5;
	let n = 2+rnd(5);
	let products: Product[] = []
	for (let i = 0; i < n; i++) {
	    this.patience += 5+rnd(5);
	    switch (rnd(3)) {
	    case 0:
		products.push(new Product1(this));
		break;
	    case 1:
		products.push(new Product2(this));
		break;
	    case 2:
		products.push(new Product3(this));
		break;
	    }
	}
	return products;
    }
}

class Customer1 extends Customer {
    constructor() {
	super(1+rnd(2));	// kid
	this.space = 2+rnd(6);
    }
}

class Customer2 extends Customer {
    constructor() {
	super(3+rnd(2));	// old
	this.space = 2+rnd(4);
    }
}

class Customer3 extends Customer {
    constructor() {
	super(5+rnd(2));	// young
	this.space = 4+rnd(4);
    }
}

class Customer4 extends Customer {
    constructor() {
	super(7+rnd(2));	// adult
	this.space = 4;
    }
}


//  Game
// 
class Game extends GameScene {

    prodBox: TextBox;
    statusBox: TextBox;
    priceBox: DialogBox;

    gameOver: boolean = false;
    health: number = 3;
    score: number = 0;
    nextcust: number = 0;
    nextbeep: number = 0;
    customers: Customer[] = [];
    products: Product[] = [];
    
    constructor(app: App) {
	super(app);
	FONT = new Font(APP.images['font'], 'white');
	COLORFONT = new Font(APP.images['font'], null);
	SHFONT = new ShadowFont(APP.images['font'], 'white');
	HIFONT = new InvertedFont(APP.images['font'], 'white');
	SPRITES = new ImageSpriteSheet(
	    APP.images['sprites'], new Vec2(16,16), new Vec2(8,8));

	this.prodBox = new TextBox(this.screen);
	this.prodBox.font = SHFONT;

	this.statusBox = new TextBox(this.screen);
	this.statusBox.font = SHFONT;
	this.statusBox.padding = 8;
	
	let textRect = this.screen.resize(160, 100);
	this.priceBox = new DialogBox(textRect);
	this.priceBox.font = FONT;
	this.priceBox.hifont = HIFONT;
	this.priceBox.padding = 8;
	this.priceBox.linespace = 4;
	this.priceBox.background = 'rgba(0,0,0,0.5)'
	this.priceBox.start(this.layer);
	this.layer.clicked.subscribe((_,sprite) => {
	    log("click:", sprite);
	});
    }
    
    startPos: Vec2 = null;
    prevPos: Vec2 = null;

    keydown(key: number) {
	if (this.gameOver) {
	    this.init();
	} else if (this.priceBox.visible) {
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
	if (this.gameOver) {
	    this.init();
	} else if (this.priceBox.visible) {
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
		    sprite.move(p.sub(this.prevPos));
		}
		this.prevPos = p;
	    }
	    this.layer.mousemove(p);
	}
    }

    init() {
	super.init();

	this.prodBox.clear();
	this.priceBox.visible = false;
	this.add(new Button(new Rect(240, 220, 40, 16)));

	this.gameOver = false;
	this.health = 3;
	this.score = 0;
	this.updateStatus();
	this.nextcust = 0;
	
	this.customers = [];
	this.addCustomer(new Customer2(), false);
	this.addCustomer(new Customer3(), false);
	this.addCustomer(new Customer1(), false);

	let casher = new Sprite(new Vec2(60,30));
	casher.imgsrc = SPRITES.get(0);
	casher.zOrder = 1;
	this.add(casher);
	
	let banner = new TextBox(this.screen.resize(220, 24));
	banner.font = FONT;
	banner.background = 'rgba(0,0,0,0.5)'
	banner.lifetime = 3;
	banner.putText(['DRAG PRODUCTS INTO BASKET!'], 'center', 'center');
	this.add(banner);
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
		let t = customer.getTimeLeft();
		if (t <= 0) {
		    this.endSession(customer, false);
		} else if (t < this.nextbeep) {
		    playSound(APP.audios['beep']);
		    this.nextbeep -= 1;
		}
	    } else if (customer.isReadyForSession()) {
		this.startSession(customer);
	    }
	}
	if (this.nextcust < t) {
	    this.nextcust = t+rnd(1, 5);
	    if (this.customers.length < CUSTOMERS_MAX) {
		let n = (this.score < 100)? 3 : 4;
		switch (rnd(n)) {
		case 0:
		    this.addCustomer(new Customer1(), true);
		    break;
		case 1:
		    this.addCustomer(new Customer2(), true);
		    break;
		case 3:
		    this.addCustomer(new Customer3(), true);
		    break;
		default:
		    this.addCustomer(new Customer4(), true);
		    break;
		}
	    }
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	fillRect(ctx, bx, by, LANERECT, 'rgb(32,128,220)');
	fillRect(ctx, bx, by, PRODRECT, 'rgb(160,200,40)');
	fillRect(ctx, bx, by, PLACERECT, 'gray');

	let customer = this.getCustomer();
	// draw a basket.
	if (customer !== null && customer.isSessionStarted()) {
	    drawRect(ctx, bx, by, customer.basket.inflate(4,4), 'black', 4);
	}
	super.render(ctx, bx, by);
	this.prodBox.render(ctx, bx, by);
	// draw a textbox and its border.
	if (this.priceBox.visible) {
	    this.priceBox.render(ctx, bx, by);
	    drawRect(ctx, bx, by, this.priceBox.frame.inflate(-2,-2), 'white', 2);
	}
	// draw the indicator.
	if (customer !== null && customer.isSessionStarted()) {
	    let t = lowerbound(0, customer.getTimeLeft());
	    ctx.fillStyle = (t < 5)? 'red' : 'rgb(0,255,0)';
	    ctx.fillRect(bx+32, by+4, t*8, 8);
	}
	// draw status.
	this.statusBox.render(ctx, bx, by);
    }

    updateStatus() {
	this.statusBox.clear();
	this.statusBox.putText(['TOTAL $'+this.score],
			       'left', 'bottom');
	this.statusBox.putText([multiply('\x7f', this.health)],
			       'right', 'bottom', COLORFONT);
    }
    
    getCustomer() {
	if (0 < this.customers.length) {
	    return this.customers[0];
	}
	return null;
    }
    
    addCustomer(customer: Customer, rightmost: boolean) {
	let x: number = 64;
	if (0 < this.customers.length) {
	    x = Math.max(x, this.customers[this.customers.length-1].pos.x);
	}
	if (rightmost) {
	    x = Math.max(x, this.screen.width);
	}
	customer.pos = new Vec2(x+16+rnd(10), 24);
	this.customers.push(customer);
	this.add(customer);
    }
    
    startSession(customer: Customer) {
	assert(!customer.isSessionStarted());
	let pos = new Vec2(240, 70);
	this.products = customer.startSession();
	for (let product of this.products) {
	    product.pos = pos;
	    this.layer.addTask(product);
	    this.prodBox.addSegment(pos.move(20, -10), product.name);
	    this.prodBox.addSegment(pos.move(20, 0), '$'+product.price);
	    pos = pos.move(0, 20);
	}
	this.nextbeep = 5;
	playSound(APP.audios['start']);
    }

    endSession(customer: Customer, success: boolean) {
	assert(customer.isSessionStarted());
	this.priceBox.visible = false;
	for (let product of this.products) {
	    product.stop();
	}
	this.products = [];
	this.prodBox.clear();
	customer.angry = !success;
	customer.walk();
	removeElement(this.customers, customer);
	if (!success) {
	    playSound(APP.audios['wrong']);
	    this.health--;
	    this.updateStatus();
	    if (this.health == 0) {
		this.showGameOver();
	    }
	}
	let balloon = new Balloon(customer.pos.move(-8,0), success? 'YAY!' : 'BOO!');
	this.add(balloon);
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
	    let d = i-correct;
	    menu.addItem(new Vec2(16, i*10+12), '$'+(total+d), d);
	}
	menu.selected.subscribe((_, value) => {
	    log("selected:", value);
	    let customer = this.getCustomer();
	    if (customer !== null) {
		if (value == 0) {
		    this.score += total;
		    this.updateStatus();
		    playSound(APP.audios['chachin']);
		    let balloon = new Balloon(new Vec2(70,this.screen.height-10), '$'+total);
		    this.add(balloon);
		}
		this.endSession(customer, value == 0);
	    }
	});
    }

    checkProducts(finish: boolean) {
	if (this.products.length == 0) return;
	let ok = true;
	for (let product of this.products) {
	    let rect = product.getCollider() as Rect;
	    if (rect !== null) {
		product.acceptable = product.customer.basket.containsRect(rect);
		ok = ok && product.acceptable;
	    } else {
		ok = false;
	    }
	}
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

    showGameOver() {
	let banner = new TextBox(this.screen.resize(200, 24));
	banner.font = FONT;
	banner.background = 'rgba(0,0,0,0.5)'
	banner.putText(['GAME OVER!'], 'center', 'center');
	this.add(banner);
	this.app.lockKeys();
	this.gameOver = true;
    }
}
