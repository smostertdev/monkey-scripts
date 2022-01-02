// ==UserScript==
// @name         Aliexpress_orders
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Export orders from aliexpress
// @author       naixx
// @match        https://trade.aliexpress.com/orderList.htm*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

// Edited from:
//https://gist.github.com/naixx/9929f308bfc0aac649d7c48c4a510737


(function() {
    'use strict';
})();

var orders = [];
var reqs = []; // hold HTTP request for order details page

var tracking_url = "https://track.aliexpress.com/logisticsdetail.htm?tradeId="
var details_url = "https://trade.aliexpress.com/order_detail.htm?orderId="

var $ = window.jQuery;

// Load order details page to pull shipping cost, coupons, etc
function get_order_details(order_id) {
    console.log("get_order_details: " + order_id);

    return new Promise((resolve, reject) => {
        console.log("loading: " + order_id);

        $.ajax ( {
            type:       'GET',
            url:        details_url + order_id,
            cache: false,
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            },
            success:    function (response) {
                var details_parsed = $.parseHTML(response);

                var total_credit_card = ""
                var total_coupons = ""

                // Try to get the credit card payment and coupon values

                $(details_parsed).find("table.fund-table#tp-buyer-order-table>tbody>tr.fund-bd").each(function() {
                    if($(this).find('td.pay-c3:contains("redit")').length != 0) {
                        total_credit_card = $(this).find('td.pay-c1').text().trim().replace(/CA C\$ /gm,'');
                    }
                    if($(this).find('td.pay-c3:contains("oupon")').length != 0) {
                        total_coupons = $(this).find('td.pay-c1').text().trim().replace(/CA C\$ /gm,'');
                    }
                });




                console.log("loaded: " + JSON.stringify({
                    "details_price": $(details_parsed).find("tbody>tr>td.product-price").text().trim(),
                    "details_shipping": $(details_parsed).find("tbody>tr>td.shipping-price").text().trim(),
                    "details_adjust": $(details_parsed).find("tbody>tr>td.change-price").text().trim(),
                    "details_discount": $(details_parsed).find("tbody>tr>td.discount-price").text().trim(),
                    "details_total": $(details_parsed).find("tbody>tr>td.order-price").text().trim(),
                    "details_payments": $(details_parsed).find("table.fund-table>tbody>tr.fund-bd>td.pay-c1").text().trim(),
                    "total_credit_card": total_credit_card,
                    "total_coupons": total_coupons
                }));

                resolve({
                    "order_id": order_id,
                    "details_price": $(details_parsed).find("tbody>tr>td.product-price").text().trim(),
                    "details_shipping": $(details_parsed).find("tbody>tr>td.shipping-price").text().trim(),
                    "details_adjust": $(details_parsed).find("tbody>tr>td.change-price").text().trim(),
                    "details_discount": $(details_parsed).find("tbody>tr>td.discount-price").text().trim(),
                    "details_total": $(details_parsed).find("tbody>tr>td.order-price").text().trim(),
                    "details_payments": $(details_parsed).find("table.fund-table>tbody>tr.fund-bd>td.pay-c1").text().trim(),
                    "total_credit_card": total_credit_card,
                    "total_coupons": total_coupons
                });
            }
        } );

    });
}

// Loop through each order
$(".order-item-wraper").each((ind, el)=>{
    var products = [];
    var has_tracking = $(el).find(".button-logisticsTracking ").length > 0;
    var inum = 0;

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

    let order_id = $(el).find(".order-info .first-row .info-body ").text().trim()

    // Put all requests to be called on button press
    reqs.push(() => get_order_details(order_id));

    let order = {
        id: order_id,
        status: $(el).find(".order-status .f-left").text().trim(),
        order_price: $(el).find(".amount-num").text().trim(),
        order_date: $(el).find(".order-info .second-row .info-body").text().trim(),
        seller_name: $(el).find(".store-info .first-row .info-body").text().trim(),
        has_tracking: has_tracking,
        products: products,
        details: "fetching",
    };

    orders.push(order);
});



function print_header() {
    var header = "";

    header += "\"Order ID\"\t";
    header += "\"Order Status\"\t";
    header += "\"Order Price\"\t";
    header += "\"Details Price\"\t";
    header += "\"Details Shipping\"\t";
    header += "\"Details Adjust\"\t";
    header += "\"Details Discount\"\t";
    header += "\"Details Total\"\t";
    header += "\"Details Payments\"\t";
    header += "\"Order Date\"\t";
    header += "\"Seller Name\"\t";
    header += "\"Has Tracking\"\t";
    header += "\"Product Name\"\t";
    header += "\"Product URL\"\t";
    header += "\"Pruduct Snapshot\"\t";
    header += "\"Pruduct Price\"\t";
    header += "\"Product Quantity\"\t";
    header += "\"Product Number\"\t";
    header += "\"Total Credit Card\"\t";
    header += "\"Total Coupons\"\t";
    header += "\"Price after savings\"\t";

    header += "\n";

    return header;
}

function clean(dirtystr) {
    let cleanstr = dirtystr.toString().replace(/[\t\n\r"]/gm,'');
    return cleanstr.replace(/ +/gm,' ');
}

function cleanPrice(dirtystr) {
    var cleanstr = parseFloat(dirtystr.toString().replace(/[^0-9.]/gm,''));
    return cleanstr ? cleanstr : 0
}

function cleanDiscount(dirtystr) {
    /*
    String like:
        "Seller coupons
        CA C$ 13.04
        Order Price Discount
        CA C$ 6.52"
    Should be:
        19.56
    */
    var cleanstr = dirtystr.toString().replace(/[^0-9.\n]/gm,'').split(/\r?\n/).reduce(function(a, b) {
        return parseFloat(a) + parseFloat(b);
      }, 0);
    return cleanstr ? cleanstr : 0;
}

function round_money(num) {
    var cleanstr = parseFloat(num).toFixed(2);
    console.log("rounding: " + num + " to: " + cleanstr);
    return cleanstr ? parseFloat(cleanstr) : 0
}

$('<button/>', {
    text: "LOAD",
    id: 'csvBtn',
    click: function () {
        $("#csvBtn").text("Loading...");
        var s = print_header();
        var order_detail;

        const detail_tasks = reqs.map(task => task());

        return Promise.all(detail_tasks).then(result => {
            orders.forEach(order=> {

                result.forEach(detail => {
                    if (detail.order_id == order.id) {
                        order_detail = detail;
                    }
                });

                order.products.forEach(product => {
                    // total value of the order
                    var total_order_value = (cleanPrice(order_detail.details_price) + cleanPrice(order_detail.details_shipping));
                    var total_savings = (cleanDiscount(order_detail.details_discount) + parseFloat(order_detail.total_coupons));
                    var prorated_shipping = round_money((cleanPrice(order_detail.details_shipping) / cleanPrice(order_detail.details_price)) * cleanPrice(product.product_price));

                    var prorated_savings = (total_savings / (cleanPrice(order_detail.details_price) + cleanPrice(order_detail.details_shipping))) * (cleanPrice(product.product_price) + prorated_shipping)

                    s += "\"" + clean(order.id) + "\"\t";
                    s += "\"" + clean(order.status) + "\"\t";
                    s += "\"" + clean(cleanPrice(order.order_price)) + "\"\t";
                    s += "\"" + clean(cleanPrice(order_detail.details_price)) + "\"\t";
                    s += "\"" + clean(cleanPrice(order_detail.details_shipping)) + "\"\t";
                    s += "\"" + clean(cleanPrice(order_detail.details_adjust)) + "\"\t";
                    s += "\"" + clean(order_detail.details_discount) + "\"\t";
                    s += "\"" + clean(cleanPrice(order_detail.details_total)) + "\"\t";
                    s += "\"" + clean(cleanPrice(order_detail.details_payments)) + "\"\t";
                    s += "\"" + clean(order.order_date) + "\"\t";
                    s += "\"" + clean(order.seller_name) + "\"\t";
                    s += "\"" + clean(order.has_tracking) + "\"\t";
                    s += "\"" + clean(product.product_name) + "\"\t";
                    s += "\"https:" + clean(product.product_url) + "\"\t";
                    s += "\"https:" + clean(product.product_snapshot) + "\"\t";
                    s += "\"" + clean(cleanPrice(product.product_price)) + "\"\t";
                    s += "\"" + clean(product.product_quantity) + "\"\t";
                    s += "\"" + clean(product.product_num) + "\"\t";
                    s += "\"" + clean(order_detail.total_credit_card) + "\"\t";
                    s += "\"" + clean(order_detail.total_coupons) + "\"\t";

                    s += "\"" + clean( round_money(cleanPrice(product.product_price) - prorated_savings) ) + "\"\t";

                    s += "\n";
                })
            });

            //console.log(s);
            GM_setClipboard(s);
            $("#csvBtn").text("Loaded to clipboard");

        });


    }
}).appendTo("#appeal-alert");
