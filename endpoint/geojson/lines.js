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

    let indexedTrips = {};

    return Promise.resolve()
        .then(() => {

            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);

            let tripIds = req.params.tripIds || {};
            tripIds = tripIds.split(",");

            return stopFinder.getTrips(tripIds);

        })
        .then(trips => {

            if (trips.length === 0)
                return [];

            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);

            trips.forEach(function (item) {

                let tripId = item.tripId;

                indexedTrips[tripId] = {
                    "line": item.line,
                    "tripType": item.type,
                    "variant": item.variant,
                    "service": item.service,
                    "stops": []
                };

            });

            return stopFinder.getTripStops(Object.keys(indexedTrips));

        })
        .then(tripStops => {

            tripStops.forEach(function(item) {

                let tripId = item.tripId;

                item.tripId = undefined;
                indexedTrips[tripId]['stops'].push(item);

            });

            return indexedTrips;

        })
        .then(result => {

            res.status(200).jsonp(result);

        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error});
        });

}
