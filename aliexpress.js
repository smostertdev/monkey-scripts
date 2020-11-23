// ==UserScript==
// @name         Aliexpress_items
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
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
var items = [];
var reqs = [];
$(".order-item-wraper").each((ind, el)=>{
    var products = [];
    var hasTracking = $(el).find(".button-logisticsTracking ").length > 0;
    inum = 0;

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
            items.push(item);
              //   console.log(item);
        });
        //  console.log(products);
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
    if (hasTracking){
        var req = new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=" + order.id + "&callback=test",
                onload:(data)=>{
                    order.tracking = eval(data.responseText).tracking;
                    order.trackingNumber = order.tracking.map(it=>it.mailNo).join(", ");
                    resolve(order);
                    orders.push(order);
                },
                onerror: () => reject(400)
            });
        });
        reqs.push(req);
    } else{
        orders.push(order);
    }
});


$.when.apply(null, reqs).done(function(){
    //   console.log(orders);
    // console.log(orders.length);
});
//<button id="search-btn" class="ui-button ui-button-primary search-btn" type="button">Search</button>


$('#mybutton').one('click', function(){
    var r=$('<input/>').attr({
        type: "button",
        id: "field",
        value: 'LOAD CSV'
    });
    $("body").append(r);
});
$('<button/>', {
    text: "LOAD", //set text 1 to 10
    id: 'csvBtn',
    click: function () {
        $("#csvBtn").text("Loading...");
        Promise.all(reqs).then(o =>{
            var s = "";

            items.forEach(e=> {
                //console.log(e);
                s += e.order_id + "\t";
                s += e.item_num + "\t";
                s += e.item_name + "\t";
                s += "https:" + e.item_url + "\t";
                s += "https:" + e.item_snapshot + "\t";
                s += e.order_status + "\t";
                s += e.item_price + "\t";
		s += e.item_amount + "\t";
                s += "https://trade.aliexpress.com/order_detail.htm?orderId=" + e.order_id + "\t";
                s += e.order_date + "\t";
                s += e.seller_name;

                s += "\n";

            });
            //console.log(s);
            GM_setClipboard (s);
            $("#csvBtn").text("Loaded to clipboard");
        });


    }
}).appendTo("#appeal-alert");


function test(data){ return data;}
