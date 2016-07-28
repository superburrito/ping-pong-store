var chalk = require('chalk');
var db = require('./server/db/_db.js');
var Models = require('./server/db/models');
var User = Models.User;
var Review = Models.Review;
var Product = Models.Product;

var Promise = require('sequelize').Promise;

var seedUsers = function () {
    var users = [
        {firstName:'paul', lastName: 'hsu', email: 'testing@fsa.com', password: 'paul', address: '75 Wall St'},
        {firstName:'yao', lastName: 'chua', email: '123@fsa.com', password: 'yao', address: '52 Mulberry St'},
        {firstName:'john', lastName: 'henry', email: 'erhigu@fsa.com', password: 'john', address: '9 S William St'},
        {firstName:'will', lastName: 'laeri', email: 'qwe@fsa.com', password: 'will', address: '85 West Broadway'},
        {firstName:'joe', lastName: 'wat', email: 'erf@fsa.com', password: 'joe', address: '8 Stone St'},
        {firstName:'tammy', lastName: 'chu', email: 'sdv@fsa.com', password: 'tammy', address: '91 E Broadway'},
        {firstName:'julia', lastName: 'julia', email: 'oer@fsa.com', password: 'julia', address: '102 N End Ave'},
        {firstName:'yurik', lastName: 'yolo', email: 'sdvowej@fsa.com', password: 'yurik', address: '55 Church St'},
        {firstName:'jay', lastName: 'johnson', email: 'jioreg@fsa.com', password: 'jay', address: '106 Bowery'},
        {firstName:'samuel', lastName: 'serverance', email: 'vdel@fsa.com', password: 'samuel', address: '15 Gold Street'}
    ];
    var creatingUsers = users.map(function (userObj) {
        return User.create(userObj);
    });
    return Promise.all(creatingUsers);
};

var seedProducts = function () {
    var products = [
        {price: '300', name: 'recursion', category: 'paddles', brand: "butterfly", inventory:'30', description:'good condition, great for curve ball', imageUrl:'http://www.killerspin.com/media/catalog/product/cache/1/thumbnail/9df78eab33525d08d6e5fb8d27136e95/k/i/killerspin-kido-5a-rtg-table-tennis-racket-angle-red.png'},
        {price: '200', name: 'offensive', category: 'paddles', brand: "butterfly", inventory:'22', description:'good for offensive player', imageUrl:'http://i.ebayimg.com/images/i/251488549734-0-1/s-l1000.jpg'},
        {price: '100', name: 'defensive', category: 'paddles', brand: "butterfly", inventory:'5', description:'good for defenssive player', imageUrl:'https://upload.wikimedia.org/wikipedia/commons/2/26/Tabletennis.jpg'},
        {price: '80', name: 'control', category: 'paddles', brand: "andro", inventory:'8', description:'good for control the ball', imageUrl:'http://robbinstabletennis.com/images/Panda-Aggressor.jpg'},
        {price: '150', name: 'speedy', category: 'paddles', brand: "julic", inventory:'14', description:'increase the balls speed', imageUrl:'http://i01.i.aliimg.com/img/pb/300/210/932/932210300_908.jpg'},
        {price: '345', name: 'destroy', category: 'paddles', brand: "donic", inventory:'12', description:'gread for smash', imageUrl:'http://www.allabouttabletennis.com/images/xrecommended-table-tennis-racket.jpg.pagespeed.ic.sXCs6YPrQW.jpg'},
        {price: '50', name: 'ping-pong-ball', category: 'balls', brand: "butterfly", quality:'3', inventory:'46', description:'best ball in the world', imageUrl:'http://d163axztg8am2h.cloudfront.net/static/img/85/3d/c2821e2805aedf71926b67e62fe9.jpg'},
        {price: '30', name: 'ping-pong-ball', category: 'balls', brand: "butterfly", quality:'2', inventory:'23', description:'not bad but not good', imageUrl:'https://cdn.shopify.com/s/files/1/1102/7688/products/Master_Ball_Single_large.jpg?v=1464423413'},
        {price: '10', name: 'ping-pong-ball', category: 'balls', brand: "butterfly", quality:'1', inventory:'198', description:'worst ball in the world', imageUrl:'http://rlv.zcache.com/pretty_monarch_butterfly_autumn_colors_ping_pong_ball-r2bfc469677b2487d98ba917f7aa4cd9f_6y0d3_324.jpg?rlvnet=1'},
        {price: '40', name: 'ping-pong-ball', category: 'balls', brand: "donic", quality:'3', inventory:'24', description:'great ball', imageUrl:'http://g02.a.alicdn.com/kf/HTB148kPIpXXXXaIXpXXq6xXFXXX2/Donic-Table-Tennis-font-b-Ball-b-font-3-font-b-Star-b-font-font-b.jpg'},
        {price: '25', name: 'ping-pong-ball', category: 'balls', brand: "donic", quality:'2', inventory:'74', description:'not great ball', imageUrl:'https://www.google.com/search?hl=zh-TW&authuser=0&biw=1349&bih=705&site=imghp&tbm=isch&sa=1&q=ping+pong+ball+donic+two+star&oq=ping+pong+ball+donic+two+star&gs_l=img.3...33621.36778.0.36906.9.9.0.0.0.0.88.537.9.9.0....0...1c.1.64.img..0.0.0.3ax7nfTNxWE#imgrc=t2hi1MEQKj0_kM%3A'},
        {price: '1', name: 'ping-pong-ball', category: 'balls', brand: "donic", quality:'1', inventory:'12', description:'can use it as pokeball', imageUrl:'http://www.hurtowniasportowa.eu/eng_pl_Table-tennis-ball-Donic-Coach-orange-7116_2.jpg'},
        {price: '1500', name: 'Terminator', category: 'robots', brand: "skynet", inventory:'15', description:'will destroy you!', imageUrl:'http://g01.a.alicdn.com/kf/HTB1_OVjIXXXXXX.XVXXq6xXFXXXB/Y-T-B3-3-Spins-font-b-Table-b-font-font-b-Tennis-b-font-font.jpg'},
        {price: '100', name: 'Robot-2000', category: 'robots', brand: "paddle-palace", inventory:'20', description:'stupid robot ever!', imageUrl:'https://upload.wikimedia.org/wikipedia/commons/9/92/TOPIO_3.jpg'},
        {price: '800', name: 'Robot-2008', category: 'robots', brand: "paddle-palace", inventory:'31', description:'dumb robot', imageUrl:'http://g01.a.alicdn.com/kf/UT8eFuKXaRcXXagOFbXt/200268814/UT8eFuKXaRcXXagOFbXt.jpg'},
        {price: '1200', name: 'Robot-2016', category: 'robots', brand: "paddle-palace", inventory:'15', description:'smart robot ever!', imageUrl:'http://tabletennisnation.com/wp-content/uploads/2015/08/robot-ping-pong.gif'},
        {price: '1200', name: 'classic-25', category:'tables', brand: 'donic', inventory:'23', description:'perfect for those who want a world-class', imageUrl:'https://images-na.ssl-images-amazon.com/images/I/71CqOWllTsL._SL1500_.jpg'},
        {price: '1000', name: 'outdoor-25', category:'tables', brand: 'donic', inventory:'41', description:'waterproof!!', imageUrl:'http://sportinggoodschina.com/8-table-tennis-table/5-1b.jpg'},
        {price: '1750', name: 'premium-compact', category:'tables', brand: 'stiga', inventory:'10', description:'designed and engineered to combine a true tournament', imageUrl:'http://www.killerspin.com/media/wysiwyg/Content-Images/Home-Page/Killerspin-Revolution-Ping-Pong-Table-Tennis.jpg'},                
        {price: '750', name: 'beginner-25', category:'tables', brand: 'stiga', inventory:'31', description:'buy one get ten free', imageUrl:'https://www.google.com/search?hl=zh-TW&authuser=0&biw=1349&bih=705&site=imghp&tbm=isch&sa=1&q=ping+pong+table&oq=ping+pong+table&gs_l=img.3..0j0i30l9.560273.560998.0.561190.5.2.0.3.3.0.85.138.2.2.0....0...1c.1.64.img..0.5.145.X1abp4T-HhY#imgrc=y6jN1twq1ZgOzM%3A'}
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'5', brand: "butterfly", inventory:'23', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'6', brand: "butterfly", inventory:'20', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'7', brand: "butterfly", inventory:'12', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'8', brand: "butterfly", inventory:'43', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'9', brand: "butterfly", inventory:'12', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'10', brand: "butterfly", inventory:'43', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'11', brand: "butterfly", inventory:'52', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'4', brand: "butterfly", inventory:'74', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '89', name: 'beatiful-shoes', category: 'shoes', size:'12', brand: "butterfly", inventory:'12', description:'great looking', imageUrl:'http://i01.i.aliimg.com/wsphoto/v2/711790555_1/Wholesale-BUTTERFLY-WTS-2-professional-sports-shoes-couple-shoes-table-tennis-shoes.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'5', brand: "butterfly", inventory:'32', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'6', brand: "butterfly", inventory:'21', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'7', brand: "butterfly", inventory:'6', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'8', brand: "butterfly", inventory:'4', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'9', brand: "butterfly", inventory:'87', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'10', brand: "butterfly", inventory:'34', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'4', brand: "butterfly", inventory:'54', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'11', brand: "butterfly", inventory:'14', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '23', name: 'ugly-shoes', category: 'shoes',size:'12', brand: "butterfly", inventory:'63', description:'ugly shape', imageUrl:'http://www.ppong.co.uk/images/products/zoom/Butterfly-LEZOLINE-SONIC-Professional-Table-Tennis-Shoes-43-PPong-co-uk-1.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'4', brand: "donic", inventory:'21', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'5', brand: "donic", inventory:'41', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'6', brand: "donic", inventory:'52', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'7', brand: "donic", inventory:'32', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'8', brand: "donic", inventory:'63', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'9', brand: "donic", inventory:'2', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'10', brand: "donic", inventory:'1', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'11', brand: "donic", inventory:'42', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '43', name: 'stick-shoes', category: 'shoes',size:'12', brand: "donic", inventory:'23', description:'help you stick on the ground', imageUrl:'http://www.tabletennisspot.com/wp-content/uploads/2015/05/Donic-table-tennis-shoes.jpg'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'4', brand: "tibhar", inventory:'3', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'5', brand: "tibhar", inventory:'1', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'6', brand: "tibhar", inventory:'4', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'7', brand: "tibhar", inventory:'4', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'8', brand: "tibhar", inventory:'12', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'9', brand: "tibhar", inventory:'53', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'10', brand: "tibhar", inventory:'2', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'11', brand: "tibhar", inventory:'23', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '56', name: 'speed-shoes', category: 'shoes',size:'12', brand: "tibhar", inventory:'1', description:'run faster than you imagine', imageUrl:'http://www.rodneystabletennis.co.nz/images/_vyr_1433blue_spirit_shoe.png'},
        // {price: '43', name: 'random-shoes', category: 'shoes',size:'8', brand: "waldner", inventory:'30', description:'bad shoes forever', imageUrl:'http://i.ebayimg.com/00/s/OTM3WDE2MDA=/z/f-IAAOSwu4BVjV1l/$_1.JPG'},
        // {price: '12', name: 'noidea-shoes', category: 'shoes',size:'6', brand: "stiga", inventory:'25', description:'somebody already wear', imageUrl:'http://thorntonstabletennis.co.uk/wp-content/uploads/2014/12/stiga_thorntons_table_tennis_shoe_1560_0314_xx_instinct_shoe.jpg'},
        // {price: '51', name: 'wth-shoes', category: 'shoes',size:'10', brand: "stiga", inventory:'42', description:'bad smell', imageUrl:'http://stigatabletennis.com/en/wp-content/themes/stigasports/scripts/timthumb.php?src=http://stigatabletennis.com/en/wp-content/uploads/2013/05/1560-0113-XX-PROSWEDE-SHOE.jpg&w=460&h=286&zc=1'},
        // {price: '13', name: 'basketball-shoes', category: 'shoes',size:'9', brand: "waldner", inventory:'12', description:'great smell', imageUrl:'http://thumbs.ebaystatic.com/images/i/191706765318-0-1/s-l225.jpg'},
        // {price: '82', name: 'wrong-shoes', category: 'shoes',size:'6', brand: "stiga", inventory:'42', description:'try it,and you will love it', imageUrl:'http://stigatabletennis.com/en/wp-content/themes/stigasports/scripts/timthumb.php?src=http://stigatabletennis.com/en/wp-content/uploads/2012/02/5520-XX-PREMIER-SHOE.jpg&w=460&h=286&zc=1'}
    ];
    var creatingProducts = products.map(function (productObj) {
        return Product.create(productObj);
    });
    return Promise.all(creatingProducts);
};

var seedReviews = function () {
    var reviews = [];
    var sample = ['good!!','excellent','best ever','bad!!','shit!!','worst in the world'];
    for(var i=1; i<21; i++){
      for(var j=1; j<11; j++){
        var obj={
            title: sample[Math.ceil(Math.random()*6-1)],
            score: Math.random()*6-1,
            feedback: sample[Math.ceil(Math.random()*6-1)],
            userId: j,
            productId: i
        };
        reviews.push(obj);
      }  
    }
    var creatingReviews = reviews.map(function (reviewObj) {
        return Review.create(reviewObj);
    });
    return Promise.all(creatingReviews);
}; 


db.sync({ force: true })
    .then(function () {
        return seedUsers();
    })
    .then(function(){
        return seedProducts();
    })
    .then(function(){
        return seedReviews();
    })
    .then(function () {
        console.log(chalk.green('Seed successful!'));
        process.exit(0);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });
