/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///
let SPRITES: SpriteSheet;
let PRODUCTS: SpriteSheet;
let FONT: Font;
let BIGFONT: Font;
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

function fillOval(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string) {
    let center = rect.center();
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(1.0, rect.height/rect.width);
    ctx.beginPath();
    ctx.arc(0, 0, rect.width/2, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawRect(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string, width: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
}

function drawBasket(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string) {
    let center = rect.center();
    ctx.beginPath();
    for (let i = -2; i <= +2; i++) {
	let y = center.y+i*rect.height/6;
	ctx.moveTo(bx+rect.x, by+y);
	ctx.lineTo(bx+rect.right(), by+y);
    }
    for (let i = -2; i <= +2; i++) {
	let x = center.x+i*rect.width/6;
	ctx.moveTo(bx+x, rect.y);
	ctx.lineTo(bx+x, rect.bottom());
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
    ctx.beginPath();
    let radius = Math.sqrt(rect.width*rect.width + rect.height*rect.height)/2;
    let angle = Math.atan2(rect.width, rect.height);
    ctx.arc(center.x, center.y, radius, -angle+Math.PI*1.5, +angle+Math.PI*1.5);
    ctx.stroke();
}

function drawCross(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string, width: number) {
    let size = Math.min(rect.width, rect.height)/2;
    let center = rect.center();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(bx+center.x-size, by+center.y+size);
    ctx.lineTo(bx+center.x+size, by+center.y-size);
    ctx.moveTo(bx+center.x-size, by+center.y-size);
    ctx.lineTo(bx+center.x+size, by+center.y+size);
    ctx.stroke();
}

function drawProhibited(
    ctx: CanvasRenderingContext2D, bx: number, by: number,
    rect: Rect, color: string, width: number) {
    let size = Math.min(rect.width, rect.height)/2;
    let center = rect.center();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(bx+center.x, by+center.y, size, 0, Math.PI*2);
    ctx.closePath();
    ctx.moveTo(bx+center.x-size, by+center.y+size);
    ctx.lineTo(bx+center.x+size, by+center.y-size);
    ctx.stroke();
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
	    Math.max(bounds.width+w, bounds.height, h),  // 0
	    Math.max(bounds.width+h, bounds.height, w),  // 1 
	    Math.max(bounds.width, w, bounds.height+h), // 2
	    Math.max(bounds.width, h, bounds.height+w), // 3
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
	    return new Rect(bounds.x, bounds.bottom(), w, h);
	default:
	    return new Rect(bounds.x, bounds.bottom(), h, w);
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


//  Trash
//
class Trash extends Sprite {

    constructor(pos: Vec2) {
	super(pos);
	this.mouseSelectable = true;
	this.imgsrc = SPRITES.get(9);
    }
    
    getBounds() {
	return this.pos.expand(24, 24);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.isFocused()) {
	    drawRect(ctx, bx, by, this.getBounds().getAABB().inflate(4,4), 'white', 2);
	}
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
    trashable: boolean = false;
    trashed: boolean = false;

    constructor(customer: Customer, size: Vec2) {
	super(new Vec2());
	this.mouseSelectable = true;
	this.customer = customer;
	this.size = size;
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	let size = this.getSize();
	let bounds = ((this.rot90)?
		      this.pos.expand(size.y, size.x) :
		      this.pos.expand(size.x, size.y));
	this.renderShadow(ctx, bx, by, bounds.move(2,2));
	super.render(ctx, bx, by);
	let rect = this.getBounds().getAABB().inflate(4,4);
	if (this.realsize && !this.acceptable) {
	    drawProhibited(ctx, bx, by, rect, 'red', 4);
	} else if (this.trashed) {
	    drawCross(ctx, bx, by, rect, 'red', 2);
	} else if (this.isFocused()) {
	    drawRect(ctx, bx, by, rect, 'white', 2);
	}
    }

    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillRect(ctx, bx, by, bounds, 'rgb(64,64,64)');
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
	return (this.realsize)? this.size.scale(16) : this.size.scale(6);
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

class ProductCabbage extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(2,2));
	this.price = rnd(5, 10);
	this.name = 'Cabbage';
	this.imgsrc = PRODUCTS.get(1,0,2,2);
    }
    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillOval(ctx, bx, by, bounds, 'rgb(64,64,64)');
    }
}
class ProductMeat extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(1,2));
	this.price = rnd(5, 10);
	this.name = 'Meat';
	this.imgsrc = PRODUCTS.get(3,0,1,2);
    }
    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillOval(ctx, bx, by, bounds, 'rgb(64,64,64)');
    }
}
class ProductChocolate extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(1,1));
	this.price = 5;
	this.name = 'Chocolt';
	this.imgsrc = PRODUCTS.get(0,0,1,1);
    }
}
class ProductIcecream extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(1,2));
	this.price = 10;
	this.name = 'Icecrem';
	this.imgsrc = PRODUCTS.get(4,0,1,2);
    }
    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillRect(ctx, bx, by, bounds.inflate(-2,-2), 'rgb(64,64,64)');
    }
}
class ProductBeer extends Product {
    constructor(customer: Customer, trashable=false) {
	super(customer, new Vec2(1,3));
	this.trashable = trashable;
	this.price = (rnd(2) == 0)? 5 : 10;
	this.name = 'Beer';
	this.imgsrc = PRODUCTS.get(5,0,1,3);
    }
    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillOval(ctx, bx, by, bounds.inflate(-2,-2), 'rgb(64,64,64)');
    }
}
class ProductCereal extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(2,3));
	this.price = rnd(5, 10);
	this.name = 'Cereal';
	this.imgsrc = PRODUCTS.get(6,0,2,3);
    }
}
class ProductWine extends Product {
    constructor(customer: Customer) {
	super(customer, new Vec2(1,3));
	this.price = rnd(10, 20);
	this.name = 'Wine';
	this.imgsrc = PRODUCTS.get(8,0,1,3);
    }
    renderShadow(ctx: CanvasRenderingContext2D, bx: number, by: number, bounds: Rect) {
	fillOval(ctx, bx, by, bounds.inflate(-2,-2), 'rgb(64,64,64)');
    }
}


//  Customer
//
class Customer extends Entity {

    sessionStart: number = -1;
    walking: boolean = false;
    angry: boolean = false;
    basket: Rect = null;
    basketColor: string = 'black';
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
	let balloon = new Balloon(this.pos.move(-8,0), this.angry? 'BOO!' : 'YAY!');
	this.layer.addTask(balloon);
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

    getProducts(): Product[] {
	// OVERRIDE
	return [];
    }
}

class CustomerKid extends Customer {
    wantBooze: boolean;
    
    constructor(wantBooze=false) {
	super(1+rnd(2));	// kids
	this.wantBooze = wantBooze;
	this.space = 2+rnd(6);
	this.extra = 32;
	this.basketColor = 'rgb(0,200,200)';
    }

    getProducts() {
	let products: Product[] = []
	if (this.wantBooze) {
	    this.patience = 15;
	    products = [
		new ProductChocolate(this),
		new ProductBeer(this, true),
	    ];
	} else {
	    this.patience = 5;
	    let n = 1+rnd(3);
	    for (let i = 0; i < n; i++) {
		this.patience += 5;
		switch (rnd(4)) {
		case 0:
		case 1:
		    products.push(new ProductChocolate(this));
		    break;
		case 2:
		    products.push(new ProductIcecream(this));
		    break;
		case 3:
		    products.push(new ProductBeer(this, true));
		    break;
		}
	    }
	}
	return products;
    }
}

class CustomerOld extends Customer {
    constructor() {
	super(3+rnd(2));	// old people
	this.space = 2+rnd(4);
	this.extra = 16;
	this.basketColor = 'rgb(64,0,0)';
    }

    getProducts() {
	this.patience = 5;
	let n = 2;
	let products: Product[] = []
	for (let i = 0; i < n; i++) {
	    this.patience += 5+rnd(10);
	    switch (rnd(2)) {
	    case 0:
		products.push(new ProductMeat(this));
		break;
	    case 1:
		products.push(new ProductCabbage(this));
		break;
	    }
	}
	return products;
    }
}

class CustomerYoung extends Customer {
    constructor() {
	super(5+rnd(2));	// young people
	this.space = 4+rnd(4);
	this.extra = 32;
	this.basketColor = 'rgb(255,40,170)';
    }

    getProducts() {
	this.patience = 1;
	let n = 3+rnd(3);
	let products: Product[] = []
	for (let i = 0; i < n; i++) {
	    this.patience += 5+rnd(5);
	    switch (rnd(3)) {
	    case 0:
	    case 1:
		products.push(new ProductBeer(this));
		break;
	    case 2:
		products.push(new ProductCereal(this));
		break;
	    }
	}
	return products;
    }
}

class CustomerAdult extends Customer {
    constructor() {
	super(7+rnd(2));	// adult
	this.space = 4;
	this.extra = 16;
	this.basketColor = 'rgb(240,200,0)';
    }

    getProducts() {
	this.patience = 10;
	let n = 2+rnd(5);
	let products: Product[] = []
	for (let i = 0; i < n; i++) {
	    this.patience += 5+rnd(5);
	    switch (rnd(4)) {
	    case 0:
		products.push(new ProductChocolate(this));
		break;
	    case 1:
		products.push(new ProductBeer(this));
		break;
	    case 2:
		products.push(new ProductCereal(this));
		break;
	    case 3:
		products.push(new ProductWine(this));
		break;
	    }
	}
	return products;
    }
}


//  Game
// 
class Game extends GameScene {

    prodBox: TextBox;
    statusBox: TextBox;
    priceBox: DialogBox;
    trash: Trash;

    gameOver: boolean = false;
    health: number = 3;
    score: number = 0;
    nextcust: number = 0;
    nextbeep: number = 0;
    customers: Customer[] = [];
    products: Product[] = [];
    explainRule: boolean = true;
    explainKids: boolean = true;
    
    constructor(app: App) {
	super(app);
	FONT = new Font(APP.images['font'], 'white');
	BIGFONT = new Font(APP.images['font'], 'red', 2);
	COLORFONT = new Font(APP.images['font'], null);
	SHFONT = new ShadowFont(APP.images['font'], 'white');
	HIFONT = new InvertedFont(APP.images['font'], 'white');
	SPRITES = new ImageSpriteSheet(APP.images['sprites'], new Vec2(16,16));
	PRODUCTS = new ImageSpriteSheet(APP.images['products'], new Vec2(16,16));

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
	    let sprite = this.layer.mouseActive;
	    if (sprite instanceof Product) {
		if (this.startPos !== null && this.startPos.equals(p)) {
		    sprite.rotate();
		    playSound(APP.audios['put']);
		}
		if (sprite.trashable && sprite.trashed) {
		    playSound(APP.audios['put']);
		    sprite.stop();
		    removeElement(this.products, sprite);
		}
	    }
	    let ok = this.checkConstraints();
	    if (ok) {
		this.checkFinished();
	    }
	    this.prevPos = null;
	    this.layer.mouseup(p, button);
	}
    }
    
    mousemove(p: Vec2) {
	if (this.priceBox.visible) {
	    this.priceBox.mousemove(p);
	} else {
	    let sprite = this.layer.mouseActive;
	    if (sprite instanceof Product) {
		if (sprite.trashable) {
		    let trashed = this.trash.getBounds().containsPt(p);
		    if (sprite.trashed != trashed) {
			sprite.trashed = trashed;
			playSound(APP.audios['put']);
		    }
		}
	    }
	    if (this.prevPos !== null) {
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

	this.trash = new Trash(new Vec2(250, 220));
	this.add(this.trash);

	this.gameOver = false;
	this.health = 3;
	this.score = 0;
	this.updateStatus();
	this.nextcust = 0;
	
	this.customers = [];
	this.addCustomer(new CustomerOld(), false);
	this.addCustomer(new CustomerYoung(), false);
	this.addCustomer(new CustomerKid(this.explainKids), false);

	let casher = new Sprite(new Vec2(60,30));
	casher.imgsrc = SPRITES.get(0);
	casher.zOrder = 1;
	this.add(casher);

	if (this.explainRule) {
	    this.explainRule = false;
	    let banner = new TextBox(this.screen.resize(220, 24));
	    banner.font = FONT;
	    banner.background = 'rgba(0,0,0,0.5)'
	    banner.lifetime = 3;
	    banner.putText(['Drag products into basket!'], 'center', 'center');
	    this.add(banner);
	}
	
	this.app.setMusic(APP.audios['village'], 3.0, 14.9);
    }

    tick(t: number) {
	super.tick(t);
	if (this.gameOver) return;
	if (this.priceBox.visible) {
	    this.priceBox.tick(t);
	}
	let customer = this.getCustomer();
	if (customer !== null) {
	    this.checkConstraints();
	    if (customer.isSessionStarted()) {
		let t = customer.getTimeLeft();
		if (t <= 0) {
		    customer.angry = true;
		    this.endSession(customer);
		    this.madeMistake('timeout');
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
		switch (rnd(4)) {
		case 0:
		    this.addCustomer(new CustomerKid(), true);
		    break;
		case 1:
		    this.addCustomer(new CustomerOld(), true);
		    break;
		case 2:
		    this.addCustomer(new CustomerYoung(), true);
		    break;
		default:
		    this.addCustomer(new CustomerAdult(), true);
		    break;
		}
	    }
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	ctx.drawImage(APP.images['lane'], 0, 0);
	fillRect(ctx, bx, by, PRODRECT, 'rgb(150,190,30)');
	fillRect(ctx, bx, by, PLACERECT, 'rgb(80,80,80)');

	let customer = this.getCustomer();
	// draw a basket.
	if (customer !== null && customer.isSessionStarted()) {
	    drawBasket(ctx, bx, by, customer.basket, customer.basketColor);
	}
	super.render(ctx, bx, by);
	this.prodBox.render(ctx, bx, by);
	// draw a textbox and its border.
	if (this.priceBox.visible) {
	    this.priceBox.render(ctx, bx, by);
	    drawRect(ctx, bx, by, this.priceBox.frame.inflate(-2,-2), 'white', 2);
	}
	// draw the indicator.
	if (!this.gameOver) {
	    if (customer !== null && customer.isSessionStarted()) {
		let t = lowerbound(0, customer.getTimeLeft());
		ctx.fillStyle = 'rgb(64,64,64)'
		ctx.fillRect(bx+33, by+5, t*8, 8);
		ctx.fillStyle = (t < 5)? 'red' : 'rgb(0,255,0)';
		ctx.fillRect(bx+32, by+4, t*8, 8);
	    }
	}
	// draw status.
	this.statusBox.render(ctx, bx, by);
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
	if (customer instanceof CustomerKid) {
	    if (this.explainKids && customer.wantBooze) {
		let banner = new TextBox(this.screen.resize(220, 48));
		banner.font = FONT;
		banner.background = 'rgba(0,0,0,0.5)'
		banner.lifetime = 3;
		banner.linespace = 4;
		banner.putText(["No beer for kids.","Put it into trash!"], 'center', 'center');
		this.add(banner);
		this.explainKids = false;
	    }
	}
	let pos = new Vec2(240, 70);
	this.products = customer.startSession();
	for (let product of this.products) {
	    product.pos = pos;
	    this.layer.addTask(product);
	    this.prodBox.addSegment(pos.move(20, -10), product.name);
	    this.prodBox.addSegment(pos.move(20, 0), '$'+product.price);
	    pos = pos.move(0, 24);
	}
	// adjust the overall patience.
	customer.patience *= Math.pow(0.8, this.score/100.0);
	this.nextbeep = 5;
	playSound(APP.audios['start']);
    }

    endSession(customer: Customer) {
	assert(customer.isSessionStarted());
	this.priceBox.visible = false;
	for (let product of this.products) {
	    product.stop();
	}
	this.products = [];
	this.prodBox.clear();
	customer.walk();
	removeElement(this.customers, customer);
    }

    openPriceBox() {
	this.priceBox.clear();
	this.priceBox.addDisplay('Total price?\n');
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
	    let customer = this.getCustomer();
	    if (customer !== null) {
		if (value == 0) {
		    this.score += total;
		    this.updateStatus();
		    playSound(APP.audios['chachin']);
		    let balloon = new Balloon(new Vec2(60,this.screen.height-10), '+$'+total);
		    this.add(balloon);
		} else {
		    customer.angry = true;
		    this.madeMistake('wrong');
		}
		this.endSession(customer);
	    }
	});
    }

    checkConstraints() {
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
	return ok;
    }

    checkFinished() {
	for (let product of this.products) {
	    if (product.trashable) {
		this.endSession(product.customer);
		this.madeMistake('illegal');
		return;
	    }
	}
	// after trashing all the beers, we get empty product list.
	if (this.products.length == 0) {
	    let customer = this.getCustomer();
	    if (customer !== null) {
		this.endSession(customer);
		return;
	    }
	}
	if (!this.priceBox.visible) {
	    this.priceBox.visible = true;
	    this.openPriceBox();
	}
    }

    updateStatus() {
	this.statusBox.clear();
	this.statusBox.putText(['SALES: $'+this.score],
			       'left', 'bottom');
	this.statusBox.putText([multiply('\x7f', this.health)],
			       'right', 'bottom', COLORFONT);
    }
    
    madeMistake(reason: string) {
	if (reason == 'timeout') {
	    playSound(APP.audios['timeout']);
	} else {
	    playSound(APP.audios['buzz']);
	}
	if (reason == 'illegal') {
	    let banner = new TextBox(this.screen.resize(220, 60));
	    banner.font = BIGFONT;
	    banner.background = 'rgba(0,0,0,0.5)'
	    banner.lifetime = 2;
	    banner.linespace = 8;
	    banner.putText(['NO ALCOHOL','FOR MINOR!'], 'center', 'center');
	    this.add(banner);
	}
	this.health--;
	this.updateStatus();
	if (this.health == 0) {
	    this.showGameOver();
	}
    }	
    
    showGameOver() {
	let banner = new TextBox(this.screen.resize(200, 48));
	banner.font = FONT;
	banner.background = 'rgba(0,0,0,0.5)'
	banner.linespace = 4;
	banner.putText(['GAME OVER!', 'SALES: $'+this.score], 'center', 'center');
	this.add(banner);
	this.app.setMusic();
	this.app.lockKeys();
	this.gameOver = true;
    }
}
