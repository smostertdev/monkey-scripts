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
var reqs = [];

var tracking_url = "https://track.aliexpress.com/logisticsdetail.htm?tradeId="

// Loop through each order
$(".order-item-wraper").each((ind, el)=>{
    var products = [];
    var hasTracking = $(el).find(".button-logisticsTracking ").length > 0;
    inum = 0;

    // Retrieve each item
    $(el).find(".order-body").each((i,e)=>{
        $(e).find(".product-sets").each((i,e)=>{
            let item = {
                item_name: $(e).find(".product-title").text().trim(),
                item_url: $(e).find(".product-title .baobei-name").attr('href'),
		        item_snapshot: $(e).find(".product-snapshot .baobei-name").attr('href'),
                item_price: $(e).find(".product-amount span:first()").text().trim(), // remove parcer for different currency
                item_amount: $(e).find(".product-amount span:eq(1)").text().trim().slice(1),
                item_num: ++inum,
                order_id: $(el).find(".order-info .first-row .info-body ").text().trim(),
                order_status: $(el).find(".order-status .f-left").text().trim(),
                order_price: $(el).find(".amount-num").text().trim(),
                order_date: $(el).find(".order-info .second-row .info-body").text().trim(),
                seller_name: $(el).find(".store-info .first-row .info-body").text().trim(),
                hasTracking: hasTracking,
            };
            products.push(item);
            //console.log(item);
        });
        //console.log(products);
    });

    let order = {
        id: $(el).find(".order-info .first-row .info-body ").text().trim(),
        status: $(el).find(".order-status .f-left").text().trim(),
        orderPrice: $(el).find(".amount-num").text().trim(),
        productPriceAndAmount: $(el).find(".product-right .product-amount").text().trim().replace(/(?:\s\s)/g, ""),
        productsNames: products.map((it)=> it.title).join(", "),
	    orderDate: $(el).find(".order-info .second-row .info-body").text().trim(),
	    sellerName: $(el).find(".store-info .first-row .info-body").text().trim(),
        hasTracking: hasTracking,
        products: products,
    };

    orders.push(order);
});


$('<button/>', {
    text: "LOAD",
    id: 'csvBtn',
    click: function () {
        $("#csvBtn").text("Loading...");
        var s = "";

        orders.forEach(order=> {

            order.products.forEach(product => {
                s += order.id + "\t";
                s += order.status + "\t";
                s += order.orderPrice + "\t";
                s += order.productPriceAndAmount + "\t";
                s += order.productsNames + "\t";
                s += order.orderDate + "\t";
                s += order.sellerName + "\t";
                s += order.hasTracking + "\t";
                s += product.item_name + "\t";
                s += "https:" + product.item_url + "\t";
                s += "https:" + product.item_snapshot + "\t";
                s += product.item_price + "\t";
                s += product.item_amount + "\t";
                s += product.item_num + "\t";
                s += product.order_id + "\t";
                s += product.order_status + "\t";
                s += product.order_price + "\t";
                s += product.order_date + "\t";
                s += product.seller_name + "\t";
                s += product.hasTracking + "\t";
                s += "\n";
            })
        });

        //console.log(s);
        GM_setClipboard (s);
        $("#csvBtn").text("Loaded to clipboard");


    }
}).appendTo("#appeal-alert");
