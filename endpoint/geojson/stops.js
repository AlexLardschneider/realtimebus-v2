'use strict';

const config = require("../../config");
const logger = require("../../util/logger");
const utils = require("../../util/utils");

const StopFinder = require("../../model/busstop/BusStops");
const LineUtils = require("../../model/line/LineUtils");
const CourseFinder = require("../../model/course/Courses");
const moment = require('moment');

module.exports.stops = function (req, res) {
    return Promise.resolve()
        .then(() => {
            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);

            let lines = req.query.lines;

            if (!utils.isEmptyArray(lines)) {
                stopFinder.setLines(LineUtils.fromExpressQuery(lines));
            }

            return stopFinder.getStops()
        })
        .then(stops => {
            res.status(200).jsonp(stops);
        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error})
        })
};

module.exports.stopsForTrip = function (req, res) {
    return Promise.resolve()
        .then(() => {
            let tripId = req.params.tripId;

            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);

            return stopFinder.getNextStops(tripId);
        })
        .then(stops => {
            res.status(200).jsonp(stops);
        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error})
        })
};

module.exports.stopTimes = function (req, res) {
    return Promise.resolve()
        .then(() => {
            let outputFormat = config.coordinate_wgs84;
            let stopFinder = new StopFinder(outputFormat);
            let errors = utils.validateStopTimes(req.query);
            let time_from = moment(decodeURIComponent(req.query.datetime_from));
            let time_to = moment(decodeURIComponent(req.query.datetime_to));

            if (!utils.isEmptyArray(errors)){
                res.status(400).jsonp({success: false, error: errors})
            }
            if(!time_from._isValid){
                res.status(400).jsonp({success: false, error: "Invalid datetime_from."})   
            }
            if(!time_to._isValid){
                res.status(400).jsonp({success: false, error: "Invalid datetime_to."})   
            }

            time_from = time_from.utc().format('HH:mm:ss');
            time_to = time_to.utc().format('HH:mm:ss');

            return stopFinder.getStopsForApp(req.query.trip_id, req.query.stop_ids, time_from, time_to);
        })
        .then(stoptimes => {
            res.status(200).jsonp(stoptimes);
        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error})
        })
};


module.exports.nextBusesAtStop = function (req, res) {
    return Promise.resolve()
        .then(() => {
            let stop = req.params.stop;
            let stopId = {};
            let regex = /^(\d+).(\d+)$/;

            if (regex.test(stop)) {
                let split = stop.split(".");

                stopId.ort_nr = split[0];
                stopId.onr_typ_nr = split[1];
            } else {
                throw(`Stop ${stop} does not match regex '${regex}'`);
            }

            let limit = config.realtime_next_stops_limit;

            return CourseFinder.getCourses(stopId, limit);
        })
        .then(stops => {
            res.status(200).jsonp(stops);
        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error})
        })
};

module.exports.fetchStops = function(req, res) {

    return Promise.resolve()
        .then(() => {

            let outputFormat = config.coordinate_wgs84;

            let stopIds = req.params.stopIds.split(",");
            let stopFinder = new StopFinder(outputFormat);

            return stopFinder.getStopsByIds(stopIds)

        })
        .then(rows => {

            res.status(200).jsonp(rows);

        })
        .catch(error => {
            logger.error(error);
            res.status(500).jsonp({success: false, error: error})
        });

};
