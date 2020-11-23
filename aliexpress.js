// ==UserScript==
// @name         Aliexpress_orders
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Export orders from aliexpress
// @author       You
// @match        https://trade.aliexpress.com/orderList.htm*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';
})();

var orders = [];
var reqs = [];     // hold HTTP request for order details page

var tracking_url = "https://track.aliexpress.com/logisticsdetail.htm?tradeId="

// Loop through each order
$(".order-item-wraper").each((ind, el)=>{
    var products = [];
    var has_tracking = $(el).find(".button-logisticsTracking ").length > 0;
    inum = 0;

    // Retrieve each product
    $(el).find(".order-body").each((i,e)=>{
        $(e).find(".product-sets").each((i,e)=>{
            let product = {
                product_name: $(e).find(".product-title").text().trim(),
                product_url: $(e).find(".product-title .baobei-name").attr('href'),
		        product_snapshot: $(e).find(".product-snapshot .baobei-name").attr('href'),
                product_price: $(e).find(".product-amount span:first()").text().trim(), // remove parcer for different currency
                product_quantity: $(e).find(".product-amount span:eq(1)").text().trim().slice(1),
                product_num: ++inum,
            };
            products.push(product);
            //console.log(product);
        });
        //console.log(products);
    });

    let order = {
        id: $(el).find(".order-info .first-row .info-body ").text().trim(),
        status: $(el).find(".order-status .f-left").text().trim(),
        order_price: $(el).find(".amount-num").text().trim(),
	    order_date: $(el).find(".order-info .second-row .info-body").text().trim(),
	    seller_name: $(el).find(".store-info .first-row .info-body").text().trim(),
        has_tracking: has_tracking,
        products: products,
    };

    orders.push(order);
});

function printHeader() {
    var header = "";

    header += "Order ID\t";
    header += "Order Status\t";
    header += "Order Price\t";
    header += "Order Date\t";
    header += "Seller Name\t";
    header += "Has Tracking\t";
    header += "Product Name\t";
    header += "Product URL\t";
    header += "Pruduct Snapshot\t";
    header += "Pruduct Price\t";
    header += "Product Quantity\t";
    header += "Product Number\t";

    header += "\n";

    return header;
}

$('<button/>', {
    text: "LOAD",
    id: 'csvBtn',
    click: function () {
        $("#csvBtn").text("Loading...");
        var s = "";

        s += printHeader();

        orders.forEach(order=> {

            order.products.forEach(product => {
                s += order.id + "\t";
                s += order.status + "\t";
                s += order.order_price + "\t";
                s += order.order_date + "\t";
                s += order.seller_name + "\t";
                s += order.has_tracking + "\t";
                s += product.product_name + "\t";
                s += "https:" + product.product_url + "\t";
                s += "https:" + product.product_snapshot + "\t";
                s += product.product_price + "\t";
                s += product.product_quantity + "\t";
                s += product.product_num + "\t";
                s += "\n";
            })
        });

        //console.log(s);
        GM_setClipboard (s);
        $("#csvBtn").text("Loaded to clipboard");

    }
}).appendTo("#appeal-alert");
