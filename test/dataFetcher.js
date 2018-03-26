'use strict'

const assert = require('assert');
const nock = require('nock');
const sinon = require('sinon');
const dataFetcher = require('../lib/dataFetcher');
const dao = require('../lib/dao');

const sandbox = sinon.sandbox.create();

const metadataHost = 'http://store.metadata.api.co.uk';
const stocksHost = 'http://stock.api.co.uk';
const recsHost = 'http://recs.api.co.uk';

function defaultNocks() {
    nock(metadataHost)
        .get('/dvds')
        .reply(200, [
            {
                id: '124',
                title: 'dvd title',
                genre: 'film',
                director: 'some director',
                credits: [],
                releaseDate: '10-02-2007'
            }
        ]);

    nock(metadataHost)
        .get('/bluerays')
        .reply(200, [
            {
                id: '125',
                title: 'blue-ray title',
                genre: 'film',
                director: 'some director',
                credits: [],
                releaseDate: '10-02-2007'
            },
            {
                id: '130',
                title: 'blue-ray title 2',
                genre: 'film',
                director: 'some director',
                credits: [],
                releaseDate: '10-02-2007'
            },
            {
                id: '140',
                title: 'blue-ray title 3',
                genre: 'film',
                director: 'some director',
                credits: [],
                releaseDate: '10-02-2007'
            }
        ]);

    nock(metadataHost)
        .get('/bluerays/150')
        .reply(200,
            {
                id: '150',
                title: 'another blue-ray title',
                genre: 'film',
                director: 'some director',
                credits: [],
                releaseDate: '10-03-2007'
            }
        );

    nock(metadataHost)
        .get('/books')
        .reply(200, [
            {
                id: '123',
                title: 'raw title',
                genre: 'fiction',
                author: 'someone',
                isbn10: '1234567898',
                isbn13: '123-1234567898',
                releaseDate: '10-02-2007'
            }
        ]);

    nock(metadataHost)
        .get('/vinyls')
        .reply(200, [
            {
                id: '126',
                albumName: 'Master of puppets',
                artistName: 'metallica',
            },
            {
                id: '127',
                albumName: 'Raining blood',
                artistName: 'Slayer',
            }
        ]);

    nock(metadataHost)
        .get('/blacklist')
        .reply(200, ['127']);

    // stocks 
    nock(stocksHost)
        .get('/item/123')
        .reply(200, {
            id: '123',
            price: 12.0,
            quantity: 1
        });

    nock(stocksHost)
        .get('/item/124')
        .reply(200, {
            id: '124',
            price: 10.0,
            quantity: 3
        });

    nock(stocksHost)
        .get('/item/125')
        .reply(200, {
            id: '125',
            price: 1.0,
            quantity: 100
        });

    nock(stocksHost)
        .get('/item/126')
        .reply(200, {
            id: '126',
            price: 10.0,
            quantity: 1
        });

    nock(stocksHost)
        .get('/item/127')
        .reply(200, {
            id: '127',
            price: 10.0,
            quantity: 1
        });

    nock(stocksHost)
        .get('/item/130')
        .reply(200, {
            id: '130',
            price: 10.0,
            quantity: 1
        });

    nock(stocksHost)
        .get('/item/140')
        .reply(200, {
            id: '140',
            price: 10.0,
            quantity: 1
        });

    nock(stocksHost)
        .get('/item/150')
        .reply(200, {
            id: '150',
            price: 15.0,
            quantity: 10
        });
}

describe('Store Metadata Fetcher', () => {
    beforeEach(() => {
        nock.disableNetConnect();
        nock.cleanAll();
        defaultNocks();

        sandbox.stub(dao, 'save').yields(null);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('books', () => {
        it('fetches books', (done) => {
            dataFetcher.fetch((err) => {
                assert.ifError(err);

                sinon.assert.calledWith(dao.save, sinon.match({
                    title: 'raw title',
                    subtitle: 'someone',
                    kind: 'fiction'
                }));
                done();
            });
        });

        it('yields an error when an API call fails', (done) => {
            nock.cleanAll()
            nock(metadataHost)
                .get('/books')
                .reply(500);

            defaultNocks();

            dataFetcher.fetch((err) => {
                assert.ok(err);
                assert.equal(err.message, 'Error: 500');
                sinon.assert.notCalled(dao.save);
                done();
            });
        });

        it('yields an error when writing to the database fails', (done) => {
            nock.cleanAll()
            dao.save.yields(new Error('DB Error!'));

            defaultNocks();

            dataFetcher.fetch((err) => {
                assert.ok(err);
                assert.equal(err.message, 'DB Error!');
                sinon.assert.callCount(dao.save, 1);
                done();
            });
        });
    });

    describe('dvds', () => {
        it('fetches dvds', (done) => {
            dataFetcher.fetch((err) => {
                assert.ifError(err);

                sinon.assert.calledWith(dao.save, sinon.match({
                    title: 'dvd title (2007)',
                    subtitle: 'some director',
                    kind: 'film'
                }));
                done();
            });
        });

        it('yields an error when an API call fails', (done) => {
            nock.cleanAll()
            nock(metadataHost)
                .get('/dvds')
                .reply(500);

            defaultNocks();

            dataFetcher.fetch((err) => {
                assert.ok(err);
                assert.equal(err.message, 'Error: 500');
                sinon.assert.notCalled(dao.save);
                done();
            });
        });
    });

    describe('blurays', () => {
        it('fetches blueray', (done) => {
            dataFetcher.fetch((err) => {
                assert.ifError(err);

                sinon.assert.calledWith(dao.save, sinon.match({
                    title: 'blue-ray title (2007)',
                    subtitle: 'some director',
                    kind: 'film'
                }));
                done();
            });
        });

        it('yields an error when an API call fails', (done) => {
            nock.cleanAll()
            nock(metadataHost)
                .get('/bluerays')
                .reply(500);

            defaultNocks();

            dataFetcher.fetch((err) => {
                assert.ok(err);
                assert.equal(err.message, 'Error: 500');
                sinon.assert.notCalled(dao.save);
                done();
            });
        });
    });

    describe('vinyls', () => {
        it('fetches vinyls', (done) => {
            dataFetcher.fetch((err) => {
                assert.ifError(err);

                sinon.assert.calledWith(dao.save, sinon.match({
                    title: 'Master of puppets',
                    subtitle: 'metallica'
                }));
                done();
            });
        });

        it('yields an error when an API call fails', (done) => {
            nock.cleanAll();
            nock(metadataHost)
                .get('/vinyls')
                .reply(500);

            dataFetcher.fetch((err) => {
                assert.ok(err);
                sinon.assert.notCalled(dao.save);
                done();
            });
        });
    });

    describe('Blacklisting', () => {
        it('exclude products that are blacklisted', (done) => {
            defaultNocks();

            dataFetcher.fetch((err) => {
                assert.ifError(err);

                sinon.assert.neverCalledWithMatch(dao.save, sinon.match({
                    id: '127'
                }));
                done();
            });
        });
    });

    describe('Stocks', () => {
        it('appends stock and price', (done) => {
            dataFetcher.fetch((err) => {
                assert.ifError(err);
                sinon.assert.calledWith(dao.save, sinon.match({
                    title: 'Master of puppets',
                    subtitle: 'metallica',
                    price: 10,
                    quantity: 1
                }));
                done();
            });
        });
    });
});
