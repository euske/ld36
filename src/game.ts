/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///
let SPRITES: SpriteSheet;

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


//  Button
//
class Button extends Sprite {
    
    constructor(frame: Rect) {
	super(frame.center());
	this.mouseSelectable = true;
	this.imgsrc = new FillImageSource('white', frame.sub(this.pos));
    }
    
}


//  Product
//
class Product extends Entity {

    customer: Customer;
    size: Vec2;
    price: number = 10;
    name: string = 'thing';
    
    rot90: boolean = false;
    realsize: boolean = false;
    acceptable: boolean = false;

    constructor(customer: Customer, color: string, size: Vec2) {
	super(new Vec2());
	this.mouseSelectable = true;
	this.customer = customer;
	this.size = size;
	this.imgsrc = new FillImageSource(color, new Rect());
	this.updateShape();
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	super.render(ctx, bx, by);
	if (this.isFocused()) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(4,4), 'white', 2);
	}
	if (this.realsize && !this.acceptable) {
	    drawRect(ctx, bx, by, this.getCollider().getAABB().inflate(2,2), 'red', 1);
	}
    }

    move(v: Vec2) {
	this.moveIfPossible(v);
	this.realsize = this.customer.basket.containsPt(this.pos);
	this.updateShape();
    }

    rotate() {
	this.rot90 = !this.rot90;
	this.updateShape();
    }

    updateShape() {
	let size = (this.realsize)? this.size : this.size.scale(0.2);
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

    static placeRect: Rect = new Rect(0, 54, 220, 186);
    
    sessionStart: number = -1;
    walking: boolean = false;
    angry: boolean = false;
    basket: Rect;
    patience: number;
    space: number;
    speed: number;
    
    constructor(pos: Vec2) {
	super(pos);
	this.imgsrc = new FillImageSource('yellow', new Rect(-8,-8,16,16));
	this.collider = this.imgsrc.dstRect;
	this.basket = Customer.placeRect.resize(100+rnd(100), 80+rnd(100));
	this.patience = 5+rnd(15);
	this.space = 8+rnd(8);
	this.speed = 2+rnd(4);
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
	this.sessionStart = this.time;
	return [
	    new Product(this, 'green', new Vec2(100,40))
	];
    }
}


//  Game
// 
class Game extends GameScene {

    prodBox: TextBox;
    priceBox: DialogBox;
    
    nextcust: number = 0;
    customers: Customer[] = [];
    products: Product[] = [];
    laneRect: Rect = new Rect(0, 0, 320, 50);
    prodRect: Rect = new Rect(220, 54, 100, 186);
    
    constructor(app: App) {
	super(app);
	let font = new Font(APP.images['font'], 'white');
	let shfont = new ShadowFont(APP.images['font'], 'white');
	let hifont = new InvertedFont(APP.images['font'], 'white');

	this.prodBox = new TextBox(this.screen);
	this.prodBox.font = shfont;

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
		    sprite.move(p.sub(this.prevPos));
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
	this.add(new Button(new Rect(240, 220, 40, 16)));
	
	this.nextcust = 0;
	this.initCustomers(3);
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
		    this.endSession(customer, false);
		}
	    } else if (customer.isReadyForSession()) {
		this.startSession(customer);
	    }
	}
	if (this.nextcust < t) {
	    this.nextcust = t+rnd(1, 5);
	    if (this.customers.length < 8) {
		this.addCustomer(true);
	    }
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	fillRect(ctx, bx, by, this.laneRect, 'rgb(32,128,220)');
	fillRect(ctx, bx, by, this.prodRect, 'rgb(128,64,0)');
	fillRect(ctx, bx, by, Customer.placeRect, 'gray');

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
	    ctx.fillStyle = 'rgb(0,255,0)';
	    ctx.fillRect(bx+32, by+4, t*16, 8);
	}
    }
    
    getCustomer() {
	if (0 < this.customers.length) {
	    return this.customers[0];
	}
	return null;
    }
    
    addCustomer(rightmost: boolean) {
	let x: number;
	if (rightmost) {
	    x = this.screen.width;
	} else if (0 < this.customers.length) {
	    x = this.customers[this.customers.length-1].pos.x + 16+rnd(10);
	} else {
	    x = 64;
	}
	let customer = new Customer(new Vec2(x, 24));
	this.customers.push(customer);
	this.add(customer);
    }
    
    initCustomers(n: number) {
	this.customers = [];
	for (let i = 0; i < n; i++) {
	    this.addCustomer(false);
	}
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
		this.endSession(customer, value == 0);
	    }
	});
    }

    checkProducts(finish: boolean) {
	let ok = false;
	for (let product of this.products) {
	    let rect = product.getCollider() as Rect;
	    product.acceptable = product.customer.basket.containsRect(rect);
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
