'use strict';

const database = require("../../database/database");
const config = require("../../config");
const logger = require("../../util/logger");
const utils = require("../../util/utils");

const LinesFinder = require("../../model/line/LinesFinder");
const StopFinder = require("../../model/busstop/BusStops");

module.exports.fetchAllLinesAction = function (req, res) {
    database.connect()
        .then(client => {
            return Promise.resolve()
                .then(() => {
                    let city = req.query.city || '';

                    let linesFinder = new LinesFinder(client);

                    return linesFinder.getAllLines(city)
                })
                .then(lines => {
                    res.status(200).jsonp(lines);

                    client.release();
                })
                .catch(error => {
                    logger.error(error);
                    utils.respondWithError(res, error);

                    client.release();
                })
        })
        .catch(error => {
            logger.error(`Error acquiring client: ${error}`);

            utils.respondWithError(res, error);
            utils.handleError(error)
        })
};

module.exports.fetchLinesAction = function (req, res) {
    database.connect()
        .then(client => {
            return Promise.resolve()
                .then(() => {
                    let city = req.query.city || '';
                    let timeHorizon = config.realtimebus_timetable_time_horizon;

                    let linesFinder = new LinesFinder(client);
                    return linesFinder.getActiveLines(timeHorizon, city)
                })
                .then(lines => {
                    res.status(200).jsonp(lines);

                    client.release();
                })
                .catch(error => {
                    logger.error(error);
                    utils.respondWithError(res, error);

                    client.release();
                })
        })
        .catch(error => {
            logger.error(`Error acquiring client: ${error}`);

            utils.respondWithError(res, error);
            utils.handleError(error)
        })
};

module.exports.fetchTrips = function (req, res) {

    return Promise.resolve()
        .then(rows => {

            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);

            let tripIds = req.params.tripIds || {};
            tripIds = tripIds.split(",");

            return stopFinder.getTrips(tripIds);

        })
        .then(rows => {

            let indexedTrips = {};

            rows.forEach(function (item) {

                let tripId = item.tripId;

                if (indexedTrips[tripId] === undefined)
                    indexedTrips[tripId] = [];

                indexedTrips[tripId].push(item);

            });

            res.status(200).jsonp(indexedTrips);

        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error});
        });

}
