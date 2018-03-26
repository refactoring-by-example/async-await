const _ = require('lodash');
const async = require('async');
const request = require('request').defaults({ json: true });

const getTitles = require('./titles');
const dao = require('./dao');

const metadataHost = 'http://store.metadata.api.co.uk';
const stocksHost = 'http://stock.api.co.uk';

const CONCURRENCY_LEVEL = 10;

const converters = {
    book: toBook,
    dvd: toDvd,
    bluray: toBlueray,
    vinyl: toVinyl
};

function getBlacklist(cb) {
    request.get(metadataHost + '/blacklist', (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Blacklist Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function getBooks(cb) {
    request.get(metadataHost + '/books', (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function getDvds(cb) {
    request.get(metadataHost + '/dvds', (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function getBluerays(cb) {
    request.get(metadataHost + '/bluerays', (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function getStocks(id, cb) {
    request.get(stocksHost + `/item/${id}`, (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function getVinyls(cb) {
    request.get(metadataHost + '/vinyls', (err, res, body) => {
        if (err) return cb(err);
        if (res.statusCode >= 400) {
            return cb(new Error(`Error: ${res.statusCode}`));
        }
        cb(null, body);
    });
}

function toBook(to) {
    const titles = getTitles({
        productType: 'book',
        bookTitle: to.title,
        kind: to.genre,
        author: to.author
    });
    return {
        id: to.id,
        type: 'book',
        title: titles.title,
        subtitle: titles.subtitle,
        kind: to.genre
    }
}

function toDvd(to) {
    const titles = getTitles({
        productType: 'dvd',
        title: to.title,
        kind: to.genre,
        director: to.director,
        year: new Date(to.releaseDate).getFullYear()
    });
    return {
        id: to.id,
        type: 'dvd',
        title: titles.title,
        subtitle: titles.subtitle,
        kind: to.genre
    }
}

function toBlueray(to) {
    const titles = getTitles({
        productType: 'blu-ray',
        title: to.title,
        kind: to.genre,
        director: to.director,
        year: new Date(to.releaseDate).getFullYear()
    });
    return {
        id: to.id,
        type: 'blu-ray',
        title: titles.title,
        subtitle: titles.subtitle,
        kind: to.genre
    }
}

function toVinyl(to) {
    const titles = getTitles({
        productType: 'vinyl-record',
        albumName: to.albumName,
        artistName: to.artistName,
    });
    return {
        id: to.id,
        type: 'vinyl-record',
        title: titles.title,
        subtitle: titles.subtitle
    }
}

function filterByBlacklist(products, blacklist) {
    return _.reject(products, (product) => {
        return _.includes(blacklist, product.id);
    });
}

function convertProducts(rawProducts) {
    const converted = [];
    for (const productType of Object.keys(rawProducts)) {
        const toProduct = converters[productType];
        for (const item of rawProducts[productType]) {
            converted.push(toProduct(item));
        }
    }
    return converted;
}

module.exports.fetch = (cb) => {
    async.waterfall([
        (done) => {
            async.parallel({
                book: getBooks,
                dvd: getDvds,
                bluray: getBluerays,
                vinyl: getVinyls,
                blacklist: getBlacklist
            }, done);
        },
        (productSourceData, done) => {
            blacklist = productSourceData.blacklist;
            productSourceData = _.omit(productSourceData, 'blacklist');

            const products = filterByBlacklist(convertProducts(productSourceData), blacklist);
            done(null, products);
        },
        (products, done) => {
            async.map(products, (product, cb) => {
                getStocks(product.id, cb);
            }, (err, stocks) => {
                if (err) return done(err);
                done(null, products, stocks);
            });
        },
        (products, stocks, done) => {
            for (const [i, product] of products.entries()) {
                product['price'] = stocks[i].price;
                product['quantity'] = stocks[i].quantity;
            }
            done(null, products);
        }

    ], (err, products) => {
        if (err) return cb(err);
        async.each(products, dao.save, cb);
    });
}
